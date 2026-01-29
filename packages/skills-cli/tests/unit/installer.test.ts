/**
 * Unit tests for installer.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';

// Mock fs-extra before importing installer
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    ensureDir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    remove: vi.fn(),
    symlink: vi.fn(),
  },
}));

// Mock github module
vi.mock('../../src/core/github.js', () => ({
  fetchSkillFile: vi.fn(),
}));

// Mock validator module
vi.mock('../../src/core/validator.js', () => ({
  validateSkill: vi.fn(),
}));

import fs from 'fs-extra';
import { fetchSkillFile } from '../../src/core/github.js';
import { validateSkill } from '../../src/core/validator.js';
import {
  getAgentDir,
  getClaudeAgentsDir,
  getClaudeSkillsDir,
  getClaudeDir,
  getClaudeSymlinksDir,
  getClaudeLockFilePath,
  getSkillsDir,
  getSettingsPath,
  loadSettings,
  saveSettings,
  initAgentDir,
  convertToSkillMd,
  installSkill,
  removeSkill,
  listInstalledSkills,
} from '../../src/core/installer.js';
import { createMinimalSkill, createCliSkill, createRegistrySkill, createGitHubSource } from '../setup.js';
import type { Skill, RegistrySkill } from '../../src/types/index.js';
import type { GitHubSource } from '../../src/core/github.js';

describe('installer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.pathExists).mockResolvedValue(false);
    vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.remove).mockResolvedValue(undefined);
    vi.mocked(fs.symlink).mockResolvedValue(undefined);
  });

  describe('directory path functions', () => {
    describe('getAgentDir', () => {
      it('should return .agent in current directory by default', () => {
        const result = getAgentDir();
        expect(result).toBe(path.join(process.cwd(), '.agent'));
      });

      it('should return .agent in specified directory', () => {
        const result = getAgentDir('/custom/path');
        expect(result).toBe('/custom/path/.agent');
      });
    });

    describe('getClaudeAgentsDir', () => {
      it('should return ~/.agents', () => {
        const result = getClaudeAgentsDir();
        expect(result).toBe(path.join(os.homedir(), '.agents'));
      });
    });

    describe('getClaudeSkillsDir', () => {
      it('should return ~/.agents/skills', () => {
        const result = getClaudeSkillsDir();
        expect(result).toBe(path.join(os.homedir(), '.agents', 'skills'));
      });
    });

    describe('getClaudeDir', () => {
      it('should return ~/.claude', () => {
        const result = getClaudeDir();
        expect(result).toBe(path.join(os.homedir(), '.claude'));
      });
    });

    describe('getClaudeSymlinksDir', () => {
      it('should return ~/.claude/skills', () => {
        const result = getClaudeSymlinksDir();
        expect(result).toBe(path.join(os.homedir(), '.claude', 'skills'));
      });
    });

    describe('getClaudeLockFilePath', () => {
      it('should return ~/.agents/.skill-lock.json', () => {
        const result = getClaudeLockFilePath();
        expect(result).toBe(path.join(os.homedir(), '.agents', '.skill-lock.json'));
      });
    });

    describe('getSkillsDir', () => {
      it('should return .agent/skills in current directory by default', () => {
        const result = getSkillsDir();
        expect(result).toBe(path.join(process.cwd(), '.agent', 'skills'));
      });

      it('should return .agent/skills in specified directory', () => {
        const result = getSkillsDir('/custom/path');
        expect(result).toBe('/custom/path/.agent/skills');
      });
    });

    describe('getSettingsPath', () => {
      it('should return .agent/settings.json in current directory by default', () => {
        const result = getSettingsPath();
        expect(result).toBe(path.join(process.cwd(), '.agent', 'settings.json'));
      });

      it('should return .agent/settings.json in specified directory', () => {
        const result = getSettingsPath('/custom/path');
        expect(result).toBe('/custom/path/.agent/settings.json');
      });
    });
  });

  describe('loadSettings', () => {
    it('should return default config when file does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const result = await loadSettings('/test');

      expect(result).toEqual({
        version: '1.0.0',
        skills: { installed: [] },
        triggers: { keywords: {}, filePatterns: {} },
      });
    });

    it('should load existing settings file', async () => {
      const existingSettings = {
        version: '1.0.0',
        skills: {
          installed: [
            { name: 'existing-skill', version: '1.0.0', type: 'knowledge', path: 'path', enabled: true, installedAt: '2026-01-01', source: 'test' },
          ],
        },
        triggers: { keywords: { test: ['existing-skill'] } },
      };
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingSettings));

      const result = await loadSettings('/test');

      expect(result.skills.installed).toHaveLength(1);
      expect(result.skills.installed[0].name).toBe('existing-skill');
    });
  });

  describe('saveSettings', () => {
    it('should ensure directory exists and write file', async () => {
      const config = {
        version: '1.0.0',
        skills: { installed: [] },
        triggers: {},
      };

      await saveSettings(config, '/test');

      expect(fs.ensureDir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/.agent/settings.json',
        JSON.stringify(config, null, 2)
      );
    });
  });

  describe('initAgentDir', () => {
    it('should create .agent and .agent/skills directories', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      await initAgentDir('/test');

      expect(fs.ensureDir).toHaveBeenCalledWith('/test/.agent');
      expect(fs.ensureDir).toHaveBeenCalledWith('/test/.agent/skills');
    });

    it('should create settings.json if it does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      await initAgentDir('/test');

      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should not overwrite existing settings.json', async () => {
      vi.mocked(fs.pathExists).mockImplementation(async (p) => {
        if (String(p).includes('settings.json')) return true;
        return false;
      });

      await initAgentDir('/test');

      // writeFile should still be called for ensureDir, but not for settings
      const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
      const settingsWriteCall = writeFileCalls.find(call => String(call[0]).includes('settings.json'));
      expect(settingsWriteCall).toBeUndefined();
    });
  });

  describe('convertToSkillMd', () => {
    it('should convert minimal knowledge skill', () => {
      const skill = createMinimalSkill() as unknown as Skill;
      const registrySkill = createRegistrySkill() as unknown as RegistrySkill;

      const result = convertToSkillMd(skill, registrySkill);

      expect(result).toContain('---');
      expect(result).toContain('name: test-skill');
      expect(result).toContain('description:');
      expect(result).toContain('metadata:');
      expect(result).toContain('type: knowledge');
      expect(result).toContain('format: uasp');
      expect(result).toContain('# Test Skill');
    });

    it('should add allowed-tools for CLI skills', () => {
      const skill = createCliSkill() as unknown as Skill;
      const registrySkill = createRegistrySkill({ name: 'test-cli-skill', type: 'cli' }) as unknown as RegistrySkill;

      const result = convertToSkillMd(skill, registrySkill);

      expect(result).toContain('allowed-tools: Bash(test-cli-skill:*)');
    });

    it('should NOT add allowed-tools for knowledge skills', () => {
      const skill = createMinimalSkill() as unknown as Skill;
      const registrySkill = createRegistrySkill() as unknown as RegistrySkill;

      const result = convertToSkillMd(skill, registrySkill);

      expect(result).not.toContain('allowed-tools');
    });

    it('should include keywords section', () => {
      const skill = {
        ...createMinimalSkill(),
        triggers: { keywords: ['keyword1', 'keyword2'] },
      } as unknown as Skill;
      const registrySkill = createRegistrySkill() as unknown as RegistrySkill;

      const result = convertToSkillMd(skill, registrySkill);

      expect(result).toContain('## Keywords');
      expect(result).toContain('keyword1, keyword2');
    });

    it('should include intents section', () => {
      const skill = {
        ...createMinimalSkill(),
        triggers: { intents: ['intent one', 'intent two'] },
      } as unknown as Skill;
      const registrySkill = createRegistrySkill() as unknown as RegistrySkill;

      const result = convertToSkillMd(skill, registrySkill);

      expect(result).toContain('## Intents');
      expect(result).toContain('- intent one');
      expect(result).toContain('- intent two');
    });

    it('should include constraints sections', () => {
      const skill = {
        ...createMinimalSkill(),
        constraints: {
          never: ['do bad thing'],
          always: ['do good thing'],
          prefer: [{ use: 'option A', over: 'option B', when: 'condition' }],
        },
      } as unknown as Skill;
      const registrySkill = createRegistrySkill() as unknown as RegistrySkill;

      const result = convertToSkillMd(skill, registrySkill);

      expect(result).toContain('## Constraints');
      expect(result).toContain('### Never');
      expect(result).toContain('- do bad thing');
      expect(result).toContain('### Always');
      expect(result).toContain('- do good thing');
      expect(result).toContain('### Preferences');
      expect(result).toContain('**option A**');
      expect(result).toContain('option B');
      expect(result).toContain('when condition');
    });

    it('should include decisions section', () => {
      const skill = {
        ...createMinimalSkill(),
        decisions: [{ when: 'condition', then: 'action' }],
      } as unknown as Skill;
      const registrySkill = createRegistrySkill() as unknown as RegistrySkill;

      const result = convertToSkillMd(skill, registrySkill);

      expect(result).toContain('## Decisions');
      expect(result).toContain('**When** condition: action');
    });

    it('should include commands section for CLI skills', () => {
      const skill = createCliSkill({
        commands: {
          run: {
            syntax: 'test-cli run <arg>',
            description: 'Run the test',
            args: [{ name: 'arg', type: 'string', required: true, description: 'The argument' }],
            flags: [{ name: '--verbose', short: '-v', type: 'bool', purpose: 'Verbose output' }],
            note: 'This is a note',
          },
        },
      }) as unknown as Skill;
      const registrySkill = createRegistrySkill({ type: 'cli' }) as unknown as RegistrySkill;

      const result = convertToSkillMd(skill, registrySkill);

      expect(result).toContain('## Commands');
      expect(result).toContain('### run');
      expect(result).toContain('```');
      expect(result).toContain('test-cli run <arg>');
      expect(result).toContain('Run the test');
      expect(result).toContain('**Arguments:**');
      expect(result).toContain('`arg`: string (required)');
      expect(result).toContain('**Flags:**');
      expect(result).toContain('`-v, --verbose`');
      expect(result).toContain('> This is a note');
    });

    it('should include workflows section', () => {
      const skill = {
        ...createCliSkill(),
        workflows: {
          basic: {
            description: 'A basic workflow',
            steps: [
              { cmd: 'step1', note: 'First step' },
              { cmd: 'step2' },
            ],
          },
        },
      } as unknown as Skill;
      const registrySkill = createRegistrySkill({ type: 'cli' }) as unknown as RegistrySkill;

      const result = convertToSkillMd(skill, registrySkill);

      expect(result).toContain('## Workflows');
      expect(result).toContain('### basic');
      expect(result).toContain('A basic workflow');
      expect(result).toContain('**Steps:**');
      expect(result).toContain('1. `step1` - First step');
      expect(result).toContain('2. `step2`');
    });

    it('should include sources as references', () => {
      const skill = {
        ...createMinimalSkill(),
        sources: [
          { id: 'docs', url: 'https://example.com/docs', use_for: 'documentation' },
          { id: 'local', path: 'references/guide.md', use_for: 'local guide' },
        ],
      } as unknown as Skill;
      const registrySkill = createRegistrySkill() as unknown as RegistrySkill;

      const result = convertToSkillMd(skill, registrySkill);

      expect(result).toContain('## References');
      expect(result).toContain('[docs](https://example.com/docs) - documentation');
      expect(result).toContain('local: references/guide.md - local guide');
    });

    it('should include conversion footer', () => {
      const skill = createMinimalSkill() as unknown as Skill;
      const registrySkill = createRegistrySkill() as unknown as RegistrySkill;

      const result = convertToSkillMd(skill, registrySkill);

      expect(result).toContain('*Converted from UASP format');
      expect(result).toContain('knowledge skill');
    });

    it('should convert kebab-case name to Title Case', () => {
      const skill = {
        meta: {
          name: 'my-awesome-skill',
          version: '1.0.0',
          type: 'knowledge',
          description: 'desc',
        },
      } as Skill;
      const registrySkill = createRegistrySkill({ name: 'my-awesome-skill' }) as unknown as RegistrySkill;

      const result = convertToSkillMd(skill, registrySkill);

      expect(result).toContain('# My Awesome Skill');
    });
  });

  describe('installSkill', () => {
    const mockSkillYaml = `
meta:
  name: test-skill
  version: 1.0.0
  type: knowledge
  description: A test skill
triggers:
  keywords:
    - test
`;

    beforeEach(() => {
      vi.mocked(fetchSkillFile).mockResolvedValue(mockSkillYaml);
      vi.mocked(validateSkill).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(fs.pathExists).mockResolvedValue(false);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
        version: '1.0.0',
        skills: { installed: [] },
        triggers: { keywords: {} },
      }));
    });

    it('should install skill successfully', async () => {
      const source = createGitHubSource() as unknown as GitHubSource;
      const registrySkill = createRegistrySkill({ keywords: ['test'] }) as unknown as RegistrySkill;

      const result = await installSkill(source, registrySkill, { projectDir: '/test' });

      expect(result.success).toBe(true);
      expect(result.skill).toBeDefined();
      expect(result.skill?.name).toBe('test-skill');
    });

    it('should return error for invalid skill', async () => {
      vi.mocked(validateSkill).mockReturnValue({
        valid: false,
        errors: ['Invalid: missing field'],
      });

      const source = createGitHubSource() as unknown as GitHubSource;
      const registrySkill = createRegistrySkill() as unknown as RegistrySkill;

      const result = await installSkill(source, registrySkill, { projectDir: '/test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should create skill directory', async () => {
      const source = createGitHubSource() as unknown as GitHubSource;
      const registrySkill = createRegistrySkill() as unknown as RegistrySkill;

      await installSkill(source, registrySkill, { projectDir: '/test' });

      expect(fs.ensureDir).toHaveBeenCalledWith('/test/.agent/skills/test-skill');
    });

    it('should write skill file', async () => {
      const source = createGitHubSource() as unknown as GitHubSource;
      const registrySkill = createRegistrySkill() as unknown as RegistrySkill;

      await installSkill(source, registrySkill, { projectDir: '/test' });

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/.agent/skills/test-skill/test-skill.uasp.yaml',
        mockSkillYaml
      );
    });

    it('should update settings with installed skill', async () => {
      // Mock pathExists to return true for settings.json so loadSettings reads it
      vi.mocked(fs.pathExists).mockImplementation(async (p) => {
        return String(p).includes('settings.json');
      });

      const source = createGitHubSource() as unknown as GitHubSource;
      const registrySkill = createRegistrySkill({ keywords: ['kw1', 'kw2'] }) as unknown as RegistrySkill;

      await installSkill(source, registrySkill, { projectDir: '/test' });

      const settingsWriteCall = vi.mocked(fs.writeFile).mock.calls.find(
        call => String(call[0]).includes('settings.json')
      );
      expect(settingsWriteCall).toBeDefined();

      const writtenSettings = JSON.parse(settingsWriteCall![1] as string);
      expect(writtenSettings.skills.installed).toHaveLength(1);
      expect(writtenSettings.triggers.keywords['kw1']).toContain('test-skill');
      expect(writtenSettings.triggers.keywords['kw2']).toContain('test-skill');
    });

    it('should skip Claude Code installation when claudeCode=false', async () => {
      const source = createGitHubSource() as unknown as GitHubSource;
      const registrySkill = createRegistrySkill() as unknown as RegistrySkill;

      const result = await installSkill(source, registrySkill, {
        projectDir: '/test',
        claudeCode: false,
      });

      expect(result.success).toBe(true);
      expect(result.claudeCodeInstalled).toBe(false);

      // Should not write to ~/.agents/skills
      const claudeSkillsWrite = vi.mocked(fs.writeFile).mock.calls.find(
        call => String(call[0]).includes('.agents/skills')
      );
      expect(claudeSkillsWrite).toBeUndefined();
    });

    it('should install to Claude Code directories by default', async () => {
      const source = createGitHubSource() as unknown as GitHubSource;
      const registrySkill = createRegistrySkill() as unknown as RegistrySkill;

      const result = await installSkill(source, registrySkill, { projectDir: '/test' });

      expect(result.claudeCodeInstalled).toBe(true);
    });

    it('should handle fetch errors', async () => {
      vi.mocked(fetchSkillFile).mockRejectedValue(new Error('Network error'));

      const source = createGitHubSource() as unknown as GitHubSource;
      const registrySkill = createRegistrySkill() as unknown as RegistrySkill;

      const result = await installSkill(source, registrySkill, { projectDir: '/test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should remove existing skill entry before adding new one', async () => {
      vi.mocked(fs.pathExists).mockImplementation(async (p) => {
        if (String(p).includes('settings.json')) return true;
        return false;
      });
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
        version: '1.0.0',
        skills: {
          installed: [
            { name: 'test-skill', version: '0.9.0', type: 'knowledge', path: 'old/path', enabled: true, installedAt: '2026-01-01', source: 'old' },
          ],
        },
        triggers: { keywords: { old: ['test-skill'] } },
      }));

      const source = createGitHubSource() as unknown as GitHubSource;
      const registrySkill = createRegistrySkill() as unknown as RegistrySkill;

      await installSkill(source, registrySkill, { projectDir: '/test' });

      const settingsWriteCall = vi.mocked(fs.writeFile).mock.calls.find(
        call => String(call[0]).includes('settings.json')
      );
      const writtenSettings = JSON.parse(settingsWriteCall![1] as string);

      // Should only have one entry
      expect(writtenSettings.skills.installed).toHaveLength(1);
      expect(writtenSettings.skills.installed[0].version).toBe('1.0.0');
    });
  });

  describe('removeSkill', () => {
    beforeEach(() => {
      vi.mocked(fs.pathExists).mockImplementation(async (p) => {
        const pathStr = String(p);
        if (pathStr.includes('settings.json')) return true;
        if (pathStr.includes('skills/test-skill')) return true;
        if (pathStr.includes('.skill-lock.json')) return true;
        return false;
      });
      vi.mocked(fs.readFile).mockImplementation(async (p) => {
        const pathStr = String(p);
        if (pathStr.includes('settings.json')) {
          return JSON.stringify({
            version: '1.0.0',
            skills: {
              installed: [
                { name: 'test-skill', version: '1.0.0', type: 'knowledge', path: 'path', enabled: true, installedAt: '2026-01-01', source: 'test' },
              ],
            },
            triggers: { keywords: { test: ['test-skill'] } },
          });
        }
        if (pathStr.includes('.skill-lock.json')) {
          return JSON.stringify({
            version: 3,
            skills: {
              'test-skill': { source: 'test', sourceType: 'uasp', sourceUrl: '', skillPath: '', skillFolderHash: '', installedAt: '', updatedAt: '' },
            },
          });
        }
        return '';
      });
    });

    it('should remove skill successfully', async () => {
      const result = await removeSkill('test-skill', { projectDir: '/test' });

      expect(result).toBe(true);
    });

    it('should return false for non-existent skill', async () => {
      const result = await removeSkill('non-existent', { projectDir: '/test' });

      expect(result).toBe(false);
    });

    it('should remove skill from settings', async () => {
      await removeSkill('test-skill', { projectDir: '/test' });

      const settingsWriteCall = vi.mocked(fs.writeFile).mock.calls.find(
        call => String(call[0]).includes('settings.json')
      );
      const writtenSettings = JSON.parse(settingsWriteCall![1] as string);

      expect(writtenSettings.skills.installed).toHaveLength(0);
    });

    it('should remove keyword triggers', async () => {
      await removeSkill('test-skill', { projectDir: '/test' });

      const settingsWriteCall = vi.mocked(fs.writeFile).mock.calls.find(
        call => String(call[0]).includes('settings.json')
      );
      const writtenSettings = JSON.parse(settingsWriteCall![1] as string);

      expect(writtenSettings.triggers.keywords['test']).toBeUndefined();
    });

    it('should remove skill directory', async () => {
      await removeSkill('test-skill', { projectDir: '/test' });

      expect(fs.remove).toHaveBeenCalledWith('/test/.agent/skills/test-skill');
    });

    it('should skip Claude Code removal when claudeCode=false', async () => {
      await removeSkill('test-skill', { projectDir: '/test', claudeCode: false });

      // Should not try to remove from ~/.agents/skills
      const removeClaudeCall = vi.mocked(fs.remove).mock.calls.find(
        call => String(call[0]).includes('.agents/skills')
      );
      expect(removeClaudeCall).toBeUndefined();
    });

    it('should clean up empty keyword arrays', async () => {
      vi.mocked(fs.readFile).mockImplementation(async (p) => {
        const pathStr = String(p);
        if (pathStr.includes('settings.json')) {
          return JSON.stringify({
            version: '1.0.0',
            skills: {
              installed: [
                { name: 'test-skill', version: '1.0.0', type: 'knowledge', path: 'path', enabled: true, installedAt: '2026-01-01', source: 'test' },
              ],
            },
            triggers: { keywords: { test: ['test-skill', 'other-skill'] } },
          });
        }
        return JSON.stringify({ version: 3, skills: {} });
      });

      await removeSkill('test-skill', { projectDir: '/test' });

      const settingsWriteCall = vi.mocked(fs.writeFile).mock.calls.find(
        call => String(call[0]).includes('settings.json')
      );
      const writtenSettings = JSON.parse(settingsWriteCall![1] as string);

      // Should keep other-skill in the array
      expect(writtenSettings.triggers.keywords['test']).toEqual(['other-skill']);
    });
  });

  describe('listInstalledSkills', () => {
    it('should return empty array when no skills installed', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const result = await listInstalledSkills('/test');

      expect(result).toEqual([]);
    });

    it('should return installed skills', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
        version: '1.0.0',
        skills: {
          installed: [
            { name: 'skill-1', version: '1.0.0', type: 'knowledge', path: 'path1', enabled: true, installedAt: '2026-01-01', source: 'test' },
            { name: 'skill-2', version: '2.0.0', type: 'cli', path: 'path2', enabled: false, installedAt: '2026-01-02', source: 'test' },
          ],
        },
      }));

      const result = await listInstalledSkills('/test');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('skill-1');
      expect(result[1].name).toBe('skill-2');
    });
  });
});
