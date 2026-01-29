/**
 * Integration tests for skill removal
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';

import {
  createTestEnvironment,
  cleanupTestEnvironment,
  readTestFile,
  testFileExists,
  listTestDir,
  type TestEnvironment,
} from '../setup/testEnv.js';
import { createSimpleMockRegistry } from '../setup/mockRegistry.js';
import { createTestSkill, createTestRegistrySkill, createTestSkillsConfig, createTestInstalledSkill } from '../setup/fixtures.js';

let testEnv: TestEnvironment;

describe('remove integration', () => {
  beforeEach(async () => {
    testEnv = await createTestEnvironment('remove');
  });

  afterEach(async () => {
    await cleanupTestEnvironment(testEnv);
    vi.restoreAllMocks();
  });

  describe('removeSkill', () => {
    it('should remove skill from .agent/skills/', async () => {
      // First install a skill
      const skill = createTestSkill();
      const registrySkill = createTestRegistrySkill({ name: skill.meta.name });
      const { skillsDir } = await createSimpleMockRegistry(testEnv, skill);

      const { installSkill, removeSkill, initAgentDir } = await import('../../../src/core/installer.js');
      const { parseGitHubUrl } = await import('../../../src/core/github.js');

      await initAgentDir(testEnv.projectDir);

      const source = parseGitHubUrl(skillsDir)!;
      await installSkill(source, registrySkill, {
        projectDir: testEnv.projectDir,
        claudeCode: false,
      });

      // Verify it's installed
      expect(await testFileExists(testEnv, `.agent/skills/${skill.meta.name}`, 'project')).toBe(true);

      // Remove it
      const result = await removeSkill(skill.meta.name, {
        projectDir: testEnv.projectDir,
        claudeCode: false,
      });

      expect(result).toBe(true);
      expect(await testFileExists(testEnv, `.agent/skills/${skill.meta.name}`, 'project')).toBe(false);
    });

    it('should update settings.json after removal', async () => {
      const skill = createTestSkill();
      const registrySkill = createTestRegistrySkill({
        name: skill.meta.name,
        keywords: ['test-keyword'],
      });
      const { skillsDir } = await createSimpleMockRegistry(testEnv, skill, { keywords: ['test-keyword'] });

      const { installSkill, removeSkill, initAgentDir } = await import('../../../src/core/installer.js');
      const { parseGitHubUrl } = await import('../../../src/core/github.js');

      await initAgentDir(testEnv.projectDir);

      const source = parseGitHubUrl(skillsDir)!;
      await installSkill(source, registrySkill, {
        projectDir: testEnv.projectDir,
        claudeCode: false,
      });

      await removeSkill(skill.meta.name, {
        projectDir: testEnv.projectDir,
        claudeCode: false,
      });

      const settingsContent = await readTestFile(testEnv, '.agent/settings.json', 'project');
      const settings = JSON.parse(settingsContent);

      expect(settings.skills.installed).toHaveLength(0);
      expect(settings.triggers.keywords['test-keyword']).toBeUndefined();
    });

    it('should return false for non-existent skill', async () => {
      const { removeSkill, initAgentDir } = await import('../../../src/core/installer.js');

      await initAgentDir(testEnv.projectDir);

      const result = await removeSkill('non-existent-skill', {
        projectDir: testEnv.projectDir,
        claudeCode: false,
      });

      expect(result).toBe(false);
    });

    it('should preserve other skills when removing one', async () => {
      // Install two skills manually
      const { initAgentDir, saveSettings } = await import('../../../src/core/installer.js');

      await initAgentDir(testEnv.projectDir);

      // Create skill directories
      await fs.ensureDir(path.join(testEnv.projectDir, '.agent/skills/skill-1'));
      await fs.ensureDir(path.join(testEnv.projectDir, '.agent/skills/skill-2'));
      await fs.writeFile(
        path.join(testEnv.projectDir, '.agent/skills/skill-1/skill-1.uasp.yaml'),
        'meta:\n  name: skill-1\n  version: 1.0.0\n  type: knowledge\n  description: test'
      );
      await fs.writeFile(
        path.join(testEnv.projectDir, '.agent/skills/skill-2/skill-2.uasp.yaml'),
        'meta:\n  name: skill-2\n  version: 1.0.0\n  type: knowledge\n  description: test'
      );

      // Set up settings with both skills
      await saveSettings(
        {
          version: '1.0.0',
          skills: {
            installed: [
              createTestInstalledSkill({ name: 'skill-1' }),
              createTestInstalledSkill({ name: 'skill-2' }),
            ],
          },
          triggers: {
            keywords: {
              common: ['skill-1', 'skill-2'],
              unique1: ['skill-1'],
              unique2: ['skill-2'],
            },
          },
        },
        testEnv.projectDir
      );

      const { removeSkill } = await import('../../../src/core/installer.js');

      // Remove skill-1
      await removeSkill('skill-1', { projectDir: testEnv.projectDir, claudeCode: false });

      // Verify skill-2 is preserved
      expect(await testFileExists(testEnv, '.agent/skills/skill-2', 'project')).toBe(true);

      const settingsContent = await readTestFile(testEnv, '.agent/settings.json', 'project');
      const settings = JSON.parse(settingsContent);

      expect(settings.skills.installed).toHaveLength(1);
      expect(settings.skills.installed[0].name).toBe('skill-2');
      expect(settings.triggers.keywords['common']).toEqual(['skill-2']);
      expect(settings.triggers.keywords['unique2']).toEqual(['skill-2']);
      expect(settings.triggers.keywords['unique1']).toBeUndefined();
    });

    it('should clean up empty keyword arrays', async () => {
      const { initAgentDir, saveSettings, removeSkill } = await import('../../../src/core/installer.js');

      await initAgentDir(testEnv.projectDir);

      // Create skill directory
      await fs.ensureDir(path.join(testEnv.projectDir, '.agent/skills/test-skill'));
      await fs.writeFile(
        path.join(testEnv.projectDir, '.agent/skills/test-skill/test-skill.uasp.yaml'),
        'meta:\n  name: test-skill\n  version: 1.0.0\n  type: knowledge\n  description: test'
      );

      // Set up settings with skill that has exclusive keyword
      await saveSettings(
        {
          version: '1.0.0',
          skills: {
            installed: [createTestInstalledSkill({ name: 'test-skill' })],
          },
          triggers: {
            keywords: {
              exclusive: ['test-skill'],
            },
          },
        },
        testEnv.projectDir
      );

      await removeSkill('test-skill', { projectDir: testEnv.projectDir, claudeCode: false });

      const settingsContent = await readTestFile(testEnv, '.agent/settings.json', 'project');
      const settings = JSON.parse(settingsContent);

      // Empty keyword array should be removed
      expect(settings.triggers.keywords['exclusive']).toBeUndefined();
      expect(Object.keys(settings.triggers.keywords)).toHaveLength(0);
    });
  });

  describe('listInstalledSkills', () => {
    it('should list all installed skills', async () => {
      const { initAgentDir, saveSettings, listInstalledSkills } = await import('../../../src/core/installer.js');

      await initAgentDir(testEnv.projectDir);

      await saveSettings(
        {
          version: '1.0.0',
          skills: {
            installed: [
              createTestInstalledSkill({ name: 'skill-1', type: 'knowledge' }),
              createTestInstalledSkill({ name: 'skill-2', type: 'cli' }),
              createTestInstalledSkill({ name: 'skill-3', type: 'hybrid' }),
            ],
          },
        },
        testEnv.projectDir
      );

      const skills = await listInstalledSkills(testEnv.projectDir);

      expect(skills).toHaveLength(3);
      expect(skills.map(s => s.name)).toEqual(['skill-1', 'skill-2', 'skill-3']);
    });

    it('should return empty array when no skills installed', async () => {
      const { initAgentDir, listInstalledSkills } = await import('../../../src/core/installer.js');

      await initAgentDir(testEnv.projectDir);

      const skills = await listInstalledSkills(testEnv.projectDir);

      expect(skills).toHaveLength(0);
    });

    it('should return empty array when settings.json does not exist', async () => {
      const { listInstalledSkills } = await import('../../../src/core/installer.js');

      const skills = await listInstalledSkills(testEnv.projectDir);

      expect(skills).toHaveLength(0);
    });
  });
});
