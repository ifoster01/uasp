/**
 * Integration tests for skill installation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import os from 'os';

import {
  createTestEnvironment,
  cleanupTestEnvironment,
  readTestFile,
  testFileExists,
  listTestDir,
  type TestEnvironment,
} from '../setup/testEnv.js';
import { createMockRegistry, createSimpleMockRegistry } from '../setup/mockRegistry.js';
import { createTestSkill, createTestCliSkill, createTestRegistrySkill } from '../setup/fixtures.js';

// Mock os.homedir to use our test home directory
let testEnv: TestEnvironment;

describe('install integration', () => {
  beforeEach(async () => {
    testEnv = await createTestEnvironment('install');
  });

  afterEach(async () => {
    await cleanupTestEnvironment(testEnv);
    vi.restoreAllMocks();
  });

  describe('initAgentDir', () => {
    it('should create .agent directory structure', async () => {
      // Import and call initAgentDir
      const { initAgentDir } = await import('../../../src/core/installer.js');

      await initAgentDir(testEnv.projectDir);

      // Verify directories exist
      expect(await testFileExists(testEnv, '.agent', 'project')).toBe(true);
      expect(await testFileExists(testEnv, '.agent/skills', 'project')).toBe(true);
    });

    it('should create settings.json with default structure', async () => {
      const { initAgentDir } = await import('../../../src/core/installer.js');

      await initAgentDir(testEnv.projectDir);

      const settingsContent = await readTestFile(testEnv, '.agent/settings.json', 'project');
      const settings = JSON.parse(settingsContent);

      expect(settings.version).toBe('1.0.0');
      expect(settings.skills.installed).toEqual([]);
      expect(settings.triggers.keywords).toEqual({});
    });

    it('should not overwrite existing settings.json', async () => {
      const { initAgentDir, saveSettings } = await import('../../../src/core/installer.js');

      // Create initial settings
      await initAgentDir(testEnv.projectDir);
      await saveSettings(
        {
          version: '1.0.0',
          skills: {
            installed: [{ name: 'existing', version: '1.0.0', type: 'knowledge', path: '', enabled: true, installedAt: '', source: '' }],
          },
        },
        testEnv.projectDir
      );

      // Call init again
      await initAgentDir(testEnv.projectDir);

      // Verify existing skill is preserved
      const settingsContent = await readTestFile(testEnv, '.agent/settings.json', 'project');
      const settings = JSON.parse(settingsContent);

      expect(settings.skills.installed).toHaveLength(1);
      expect(settings.skills.installed[0].name).toBe('existing');
    });
  });

  describe('installSkill', () => {
    it('should install skill to .agent/skills/', async () => {
      // Create mock registry
      const skill = createTestSkill();
      const registrySkill = createTestRegistrySkill({
        name: skill.meta.name,
        keywords: skill.triggers?.keywords || [],
      });
      const { skillsDir } = await createSimpleMockRegistry(testEnv, skill);

      // Import after setting up mocks
      const { installSkill, initAgentDir } = await import('../../../src/core/installer.js');
      const { parseGitHubUrl } = await import('../../../src/core/github.js');

      await initAgentDir(testEnv.projectDir);

      const source = parseGitHubUrl(skillsDir)!;
      const result = await installSkill(source, registrySkill, {
        projectDir: testEnv.projectDir,
        claudeCode: false, // Skip Claude Code install for this test
      });

      expect(result.success).toBe(true);

      // Verify skill file exists
      const skillFilePath = `.agent/skills/${skill.meta.name}/${skill.meta.name}.uasp.yaml`;
      expect(await testFileExists(testEnv, skillFilePath, 'project')).toBe(true);

      // Verify skill content
      const content = await readTestFile(testEnv, skillFilePath, 'project');
      const installedSkill = yaml.parse(content);
      expect(installedSkill.meta.name).toBe(skill.meta.name);
    });

    it('should update settings.json with installed skill', async () => {
      const skill = createTestSkill();
      const registrySkill = createTestRegistrySkill({
        name: skill.meta.name,
        keywords: ['keyword1', 'keyword2'],
      });
      const { skillsDir } = await createSimpleMockRegistry(testEnv, skill, { keywords: ['keyword1', 'keyword2'] });

      const { installSkill, initAgentDir } = await import('../../../src/core/installer.js');
      const { parseGitHubUrl } = await import('../../../src/core/github.js');

      await initAgentDir(testEnv.projectDir);

      const source = parseGitHubUrl(skillsDir)!;
      await installSkill(source, registrySkill, {
        projectDir: testEnv.projectDir,
        claudeCode: false,
      });

      const settingsContent = await readTestFile(testEnv, '.agent/settings.json', 'project');
      const settings = JSON.parse(settingsContent);

      expect(settings.skills.installed).toHaveLength(1);
      expect(settings.skills.installed[0].name).toBe(skill.meta.name);
      expect(settings.skills.installed[0].enabled).toBe(true);
      expect(settings.triggers.keywords['keyword1']).toContain(skill.meta.name);
      expect(settings.triggers.keywords['keyword2']).toContain(skill.meta.name);
    });

    it('should handle reinstalling existing skill', async () => {
      const skill = createTestSkill();
      const registrySkill = createTestRegistrySkill({ name: skill.meta.name });
      const { skillsDir } = await createSimpleMockRegistry(testEnv, skill);

      const { installSkill, initAgentDir } = await import('../../../src/core/installer.js');
      const { parseGitHubUrl } = await import('../../../src/core/github.js');

      await initAgentDir(testEnv.projectDir);
      const source = parseGitHubUrl(skillsDir)!;

      // Install twice
      await installSkill(source, registrySkill, { projectDir: testEnv.projectDir, claudeCode: false });
      await installSkill(source, registrySkill, { projectDir: testEnv.projectDir, claudeCode: false });

      const settingsContent = await readTestFile(testEnv, '.agent/settings.json', 'project');
      const settings = JSON.parse(settingsContent);

      // Should only have one entry
      expect(settings.skills.installed).toHaveLength(1);
    });

    it('should return error for invalid skill', async () => {
      // Create invalid skill (no meta)
      const skillsDir = path.join(testEnv.projectDir, 'invalid-skills');
      await fs.ensureDir(skillsDir);
      await fs.ensureDir(path.join(skillsDir, 'invalid-skill'));
      await fs.writeFile(
        path.join(skillsDir, 'registry.json'),
        JSON.stringify({
          version: '1.0.0',
          skills: [{
            name: 'invalid-skill',
            version: '1.0.0',
            type: 'knowledge',
            description: 'Invalid',
            path: 'invalid-skill/invalid-skill.uasp.yaml',
            keywords: [],
          }],
        })
      );
      await fs.writeFile(
        path.join(skillsDir, 'invalid-skill/invalid-skill.uasp.yaml'),
        'invalid: yaml\nwithout: meta'
      );

      const { installSkill, initAgentDir } = await import('../../../src/core/installer.js');
      const { parseGitHubUrl } = await import('../../../src/core/github.js');

      await initAgentDir(testEnv.projectDir);

      const source = parseGitHubUrl(skillsDir)!;
      const result = await installSkill(
        source,
        { name: 'invalid-skill', version: '1.0.0', type: 'knowledge', description: '', path: 'invalid-skill/invalid-skill.uasp.yaml', keywords: [] },
        { projectDir: testEnv.projectDir, claudeCode: false }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should install CLI skill with commands', async () => {
      const skill = createTestCliSkill();
      // Create registry skill with correct path
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
      const result = await installSkill(source, registrySkill, {
        projectDir: testEnv.projectDir,
        claudeCode: false,
      });

      expect(result.success).toBe(true);
      expect(result.skill?.type).toBe('cli');

      // Verify skill content has commands
      const skillFilePath = `.agent/skills/${skill.meta.name}/${skill.meta.name}.uasp.yaml`;
      const content = await readTestFile(testEnv, skillFilePath, 'project');
      const installedSkill = yaml.parse(content);
      expect(installedSkill.commands).toBeDefined();
    });
  });

  describe('multiple skill installation', () => {
    it('should install multiple skills', async () => {
      const { skillsDir } = await createMockRegistry(testEnv);

      const { installSkill, initAgentDir, loadSettings } = await import('../../../src/core/installer.js');
      const { parseGitHubUrl } = await import('../../../src/core/github.js');
      const { parseRegistry } = await import('../../../src/core/registry.js');

      await initAgentDir(testEnv.projectDir);

      const registryContent = await fs.readFile(path.join(skillsDir, 'registry.json'), 'utf-8');
      const registry = parseRegistry(registryContent);
      const source = parseGitHubUrl(skillsDir)!;

      // Install all skills
      for (const registrySkill of registry.skills) {
        await installSkill(source, registrySkill, {
          projectDir: testEnv.projectDir,
          claudeCode: false,
        });
      }

      const settings = await loadSettings(testEnv.projectDir);
      expect(settings.skills.installed.length).toBe(registry.skills.length);

      // Verify each skill directory exists
      const skillDirs = await listTestDir(testEnv, '.agent/skills', 'project');
      expect(skillDirs.length).toBe(registry.skills.length);
    });
  });
});
