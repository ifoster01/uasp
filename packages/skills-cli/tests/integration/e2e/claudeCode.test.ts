/**
 * Integration tests for Claude Code compatibility
 * Tests SKILL.md generation, symlinks, and directory structures
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import yaml from 'yaml';

import {
  createTestEnvironment,
  cleanupTestEnvironment,
  readTestFile,
  testFileExists,
  isTestSymlink,
  getTestSymlinkTarget,
  type TestEnvironment,
} from '../setup/testEnv.js';
import { createSimpleMockRegistry } from '../setup/mockRegistry.js';
import { createTestSkill, createTestCliSkill, createTestHybridSkill, createTestRegistrySkill } from '../setup/fixtures.js';
import type { Skill, RegistrySkill } from '../../../src/types/index.js';

let testEnv: TestEnvironment;

// We need to mock the homedir for Claude Code paths
const originalHomedir = os.homedir;

describe('Claude Code integration', () => {
  beforeEach(async () => {
    testEnv = await createTestEnvironment('claude-code');

    // Mock os.homedir to use our test home directory
    vi.spyOn(os, 'homedir').mockReturnValue(testEnv.homeDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanupTestEnvironment(testEnv);
  });

  describe('SKILL.md generation', () => {
    it('should generate valid YAML frontmatter', async () => {
      const { convertToSkillMd } = await import('../../../src/core/installer.js');

      const skill = createTestSkill() as Skill;
      const registrySkill = createTestRegistrySkill() as RegistrySkill;

      const skillMd = convertToSkillMd(skill, registrySkill);

      // Extract frontmatter
      const frontmatterMatch = skillMd.match(/^---\n([\s\S]*?)\n---/);
      expect(frontmatterMatch).not.toBeNull();

      const frontmatter = yaml.parse(frontmatterMatch![1]);
      expect(frontmatter.name).toBe(skill.meta.name);
      expect(frontmatter.description).toBeDefined();
      expect(frontmatter.metadata).toBeDefined();
      expect(frontmatter.metadata.type).toBe(skill.meta.type);
      expect(frontmatter.metadata.format).toBe('uasp');
    });

    it('should add allowed-tools for CLI skills', async () => {
      const { convertToSkillMd } = await import('../../../src/core/installer.js');

      const skill = createTestCliSkill() as Skill;
      const registrySkill = createTestRegistrySkill({ type: 'cli', name: skill.meta.name }) as RegistrySkill;

      const skillMd = convertToSkillMd(skill, registrySkill);

      const frontmatterMatch = skillMd.match(/^---\n([\s\S]*?)\n---/);
      const frontmatter = yaml.parse(frontmatterMatch![1]);

      expect(frontmatter['allowed-tools']).toBe(`Bash(${skill.meta.name}:*)`);
    });

    it('should NOT add allowed-tools for knowledge skills', async () => {
      const { convertToSkillMd } = await import('../../../src/core/installer.js');

      const skill = createTestSkill() as Skill;
      const registrySkill = createTestRegistrySkill() as RegistrySkill;

      const skillMd = convertToSkillMd(skill, registrySkill);

      const frontmatterMatch = skillMd.match(/^---\n([\s\S]*?)\n---/);
      const frontmatter = yaml.parse(frontmatterMatch![1]);

      expect(frontmatter['allowed-tools']).toBeUndefined();
    });

    it('should include Keywords section for searchability', async () => {
      const { convertToSkillMd } = await import('../../../src/core/installer.js');

      const skill = createTestSkill({
        triggers: { keywords: ['browser', 'automation', 'web'] },
      }) as Skill;
      const registrySkill = createTestRegistrySkill() as RegistrySkill;

      const skillMd = convertToSkillMd(skill, registrySkill);

      expect(skillMd).toContain('## Keywords');
      expect(skillMd).toContain('browser');
      expect(skillMd).toContain('automation');
      expect(skillMd).toContain('web');
    });

    it('should include Intents section for searchability', async () => {
      const { convertToSkillMd } = await import('../../../src/core/installer.js');

      const skill = createTestSkill({
        triggers: {
          keywords: ['test'],
          intents: ['automate browser interactions', 'take screenshots'],
        },
      }) as Skill;
      const registrySkill = createTestRegistrySkill() as RegistrySkill;

      const skillMd = convertToSkillMd(skill, registrySkill);

      expect(skillMd).toContain('## Intents');
      expect(skillMd).toContain('- automate browser interactions');
      expect(skillMd).toContain('- take screenshots');
    });

    it('should document commands for CLI skills', async () => {
      const { convertToSkillMd } = await import('../../../src/core/installer.js');

      const skill = createTestCliSkill({
        commands: {
          run: {
            syntax: 'test-cli run <file>',
            description: 'Run a test file',
            args: [{ name: 'file', type: 'string', required: true }],
            flags: [{ name: '--verbose', short: '-v', type: 'bool', purpose: 'Verbose output' }],
          },
        },
      }) as Skill;
      const registrySkill = createTestRegistrySkill({ type: 'cli' }) as RegistrySkill;

      const skillMd = convertToSkillMd(skill, registrySkill);

      expect(skillMd).toContain('## Commands');
      expect(skillMd).toContain('### run');
      expect(skillMd).toContain('test-cli run <file>');
      expect(skillMd).toContain('**Arguments:**');
      expect(skillMd).toContain('`file`: string (required)');
      expect(skillMd).toContain('**Flags:**');
      expect(skillMd).toContain('--verbose');
    });

    it('should include Constraints sections', async () => {
      const { convertToSkillMd } = await import('../../../src/core/installer.js');

      const skill = createTestSkill({
        constraints: {
          never: ['use deprecated API'],
          always: ['validate input first'],
          prefer: [{ use: 'async', over: 'sync', when: 'possible' }],
        },
      }) as Skill;
      const registrySkill = createTestRegistrySkill() as RegistrySkill;

      const skillMd = convertToSkillMd(skill, registrySkill);

      expect(skillMd).toContain('## Constraints');
      expect(skillMd).toContain('### Never');
      expect(skillMd).toContain('- use deprecated API');
      expect(skillMd).toContain('### Always');
      expect(skillMd).toContain('- validate input first');
      expect(skillMd).toContain('### Preferences');
      expect(skillMd).toContain('**async**');
    });
  });

  describe('directory structure', () => {
    it('should write SKILL.md to ~/.agents/skills/{name}/', async () => {
      const skill = createTestSkill();
      const registrySkill = createTestRegistrySkill({
        name: skill.meta.name,
        keywords: skill.triggers?.keywords || [],
      });
      const { skillsDir } = await createSimpleMockRegistry(testEnv, skill);

      const { installSkill, initAgentDir } = await import('../../../src/core/installer.js');
      const { parseGitHubUrl } = await import('../../../src/core/github.js');

      await initAgentDir(testEnv.projectDir);

      const source = parseGitHubUrl(skillsDir)!;
      const result = await installSkill(source, registrySkill, {
        projectDir: testEnv.projectDir,
        claudeCode: true,
      });

      expect(result.claudeCodeInstalled).toBe(true);

      // Check ~/.agents/skills/{name}/SKILL.md exists
      const skillMdPath = `.agents/skills/${skill.meta.name}/SKILL.md`;
      expect(await testFileExists(testEnv, skillMdPath, 'home')).toBe(true);

      // Verify content
      const content = await readTestFile(testEnv, skillMdPath, 'home');
      expect(content).toContain('---');
      expect(content).toContain(`name: ${skill.meta.name}`);
    });

    it('should create symlink in ~/.claude/skills/', async () => {
      const skill = createTestSkill();
      const registrySkill = createTestRegistrySkill({
        name: skill.meta.name,
        keywords: skill.triggers?.keywords || [],
      });
      const { skillsDir } = await createSimpleMockRegistry(testEnv, skill);

      const { installSkill, initAgentDir } = await import('../../../src/core/installer.js');
      const { parseGitHubUrl } = await import('../../../src/core/github.js');

      await initAgentDir(testEnv.projectDir);

      const source = parseGitHubUrl(skillsDir)!;
      await installSkill(source, registrySkill, {
        projectDir: testEnv.projectDir,
        claudeCode: true,
      });

      // Check symlink exists
      const symlinkPath = `.claude/skills/${skill.meta.name}`;
      expect(await isTestSymlink(testEnv, symlinkPath, 'home')).toBe(true);

      // Check symlink target
      const target = await getTestSymlinkTarget(testEnv, symlinkPath, 'home');
      expect(target).toContain('.agents/skills');
      expect(target).toContain(skill.meta.name);
    });

    it('should update lock file at ~/.agents/.skill-lock.json', async () => {
      const skill = createTestSkill();
      const registrySkill = createTestRegistrySkill({
        name: skill.meta.name,
        keywords: skill.triggers?.keywords || [],
      });
      const { skillsDir } = await createSimpleMockRegistry(testEnv, skill);

      const { installSkill, initAgentDir } = await import('../../../src/core/installer.js');
      const { parseGitHubUrl } = await import('../../../src/core/github.js');

      await initAgentDir(testEnv.projectDir);

      const source = parseGitHubUrl(skillsDir)!;
      await installSkill(source, registrySkill, {
        projectDir: testEnv.projectDir,
        claudeCode: true,
      });

      // Check lock file exists
      const lockFilePath = '.agents/.skill-lock.json';
      expect(await testFileExists(testEnv, lockFilePath, 'home')).toBe(true);

      // Verify content
      const content = await readTestFile(testEnv, lockFilePath, 'home');
      const lockFile = JSON.parse(content);

      expect(lockFile.version).toBe(3);
      expect(lockFile.skills[skill.meta.name]).toBeDefined();
      expect(lockFile.skills[skill.meta.name].sourceType).toBe('local');
    });
  });

  describe('removal', () => {
    it('should remove from all Claude Code locations', async () => {
      const skill = createTestSkill();
      const registrySkill = createTestRegistrySkill({
        name: skill.meta.name,
        keywords: skill.triggers?.keywords || [],
      });
      const { skillsDir } = await createSimpleMockRegistry(testEnv, skill);

      const { installSkill, removeSkill, initAgentDir } = await import('../../../src/core/installer.js');
      const { parseGitHubUrl } = await import('../../../src/core/github.js');

      await initAgentDir(testEnv.projectDir);

      const source = parseGitHubUrl(skillsDir)!;
      await installSkill(source, registrySkill, {
        projectDir: testEnv.projectDir,
        claudeCode: true,
      });

      // Remove the skill
      await removeSkill(skill.meta.name, {
        projectDir: testEnv.projectDir,
        claudeCode: true,
      });

      // Verify all locations are cleaned up
      expect(await testFileExists(testEnv, `.agents/skills/${skill.meta.name}`, 'home')).toBe(false);
      expect(await testFileExists(testEnv, `.claude/skills/${skill.meta.name}`, 'home')).toBe(false);

      // Verify lock file is updated
      const lockContent = await readTestFile(testEnv, '.agents/.skill-lock.json', 'home');
      const lockFile = JSON.parse(lockContent);
      expect(lockFile.skills[skill.meta.name]).toBeUndefined();
    });

    it('should work with --no-claude-code flag', async () => {
      const skill = createTestSkill();
      const registrySkill = createTestRegistrySkill({
        name: skill.meta.name,
        keywords: skill.triggers?.keywords || [],
      });
      const { skillsDir } = await createSimpleMockRegistry(testEnv, skill);

      const { installSkill, initAgentDir } = await import('../../../src/core/installer.js');
      const { parseGitHubUrl } = await import('../../../src/core/github.js');

      await initAgentDir(testEnv.projectDir);

      const source = parseGitHubUrl(skillsDir)!;
      const result = await installSkill(source, registrySkill, {
        projectDir: testEnv.projectDir,
        claudeCode: false, // Skip Claude Code
      });

      expect(result.success).toBe(true);
      expect(result.claudeCodeInstalled).toBe(false);

      // Project-local should exist
      expect(await testFileExists(testEnv, `.agent/skills/${skill.meta.name}`, 'project')).toBe(true);

      // Claude Code locations should NOT exist
      expect(await testFileExists(testEnv, `.agents/skills/${skill.meta.name}`, 'home')).toBe(false);
      expect(await testFileExists(testEnv, `.claude/skills/${skill.meta.name}`, 'home')).toBe(false);
    });
  });

  describe('contract tests - Claude Code compatibility', () => {
    it('should generate SKILL.md with valid frontmatter that Claude Code can parse', async () => {
      const skill = createTestCliSkill();
      const registrySkill = createTestRegistrySkill({
        name: skill.meta.name,
        type: 'cli',
        path: `${skill.meta.name}/${skill.meta.name}.uasp.yaml`,
        keywords: skill.triggers?.keywords || [],
      });
      const { skillsDir } = await createSimpleMockRegistry(testEnv, skill);

      const { installSkill, initAgentDir } = await import('../../../src/core/installer.js');
      const { parseGitHubUrl } = await import('../../../src/core/github.js');

      await initAgentDir(testEnv.projectDir);

      const source = parseGitHubUrl(skillsDir)!;
      await installSkill(source, registrySkill, {
        projectDir: testEnv.projectDir,
        claudeCode: true,
      });

      const skillMdPath = `.agents/skills/${skill.meta.name}/SKILL.md`;
      const content = await readTestFile(testEnv, skillMdPath, 'home');

      // Frontmatter must start and end with ---
      expect(content.startsWith('---\n')).toBe(true);
      expect(content.indexOf('\n---', 4) > 0).toBe(true);

      // Must be parseable YAML
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      expect(frontmatterMatch).not.toBeNull();

      const frontmatter = yaml.parse(frontmatterMatch![1]);

      // Required fields for Claude Code
      expect(typeof frontmatter.name).toBe('string');
      expect(typeof frontmatter.description).toBe('string');

      // CLI skills must have allowed-tools
      expect(frontmatter['allowed-tools']).toBe(`Bash(${skill.meta.name}:*)`);
    });

    it('should create resolvable symlinks', async () => {
      const skill = createTestSkill();
      const registrySkill = createTestRegistrySkill({
        name: skill.meta.name,
        keywords: skill.triggers?.keywords || [],
      });
      const { skillsDir } = await createSimpleMockRegistry(testEnv, skill);

      const { installSkill, initAgentDir } = await import('../../../src/core/installer.js');
      const { parseGitHubUrl } = await import('../../../src/core/github.js');

      await initAgentDir(testEnv.projectDir);

      const source = parseGitHubUrl(skillsDir)!;
      await installSkill(source, registrySkill, {
        projectDir: testEnv.projectDir,
        claudeCode: true,
      });

      // Symlink should resolve to a real directory
      const symlinkPath = path.join(testEnv.homeDir, '.claude', 'skills', skill.meta.name);
      const realPath = await fs.realpath(symlinkPath);

      expect(await fs.pathExists(realPath)).toBe(true);
      expect(await fs.pathExists(path.join(realPath, 'SKILL.md'))).toBe(true);
    });
  });
});
