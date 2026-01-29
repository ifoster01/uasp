/**
 * Mock registry setup for integration tests
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import type { TestEnvironment } from './testEnv.js';
import type { Registry, RegistrySkill, Skill } from '../../../src/types/index.js';
import { createTestRegistry, createTestSkill, createTestCliSkill, createTestHybridSkill, createTestRegistrySkill } from './fixtures.js';

export interface MockRegistryOptions {
  /** Custom skills to include in registry */
  skills?: RegistrySkill[];
  /** Whether to create skill files */
  createSkillFiles?: boolean;
  /** Custom skill data for skill files */
  skillData?: Record<string, Skill>;
}

/**
 * Create a local mock registry for testing
 */
export async function createMockRegistry(
  env: TestEnvironment,
  options: MockRegistryOptions = {}
): Promise<{ registryPath: string; skillsDir: string }> {
  const { skills, createSkillFiles = true, skillData } = options;

  // Create skills directory in project
  const skillsDir = path.join(env.projectDir, 'mock-skills');
  await fs.ensureDir(skillsDir);

  // Create registry
  const registry = createTestRegistry(skills);
  const registryPath = path.join(skillsDir, 'registry.json');
  await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));

  // Create skill files if requested
  if (createSkillFiles) {
    for (const registrySkill of registry.skills) {
      const skillDir = path.join(skillsDir, path.dirname(registrySkill.path));
      await fs.ensureDir(skillDir);

      // Get skill data from options or create default
      let skill: Skill;
      if (skillData && skillData[registrySkill.name]) {
        skill = skillData[registrySkill.name];
      } else {
        // Create default skill based on type
        switch (registrySkill.type) {
          case 'cli':
            skill = createTestCliSkill({
              meta: {
                name: registrySkill.name,
                version: registrySkill.version,
                type: 'cli',
                description: registrySkill.description,
              },
              triggers: { keywords: registrySkill.keywords },
            });
            break;
          case 'hybrid':
            skill = createTestHybridSkill({
              meta: {
                name: registrySkill.name,
                version: registrySkill.version,
                type: 'hybrid',
                description: registrySkill.description,
              },
              triggers: { keywords: registrySkill.keywords },
            });
            break;
          default:
            skill = createTestSkill({
              meta: {
                name: registrySkill.name,
                version: registrySkill.version,
                type: 'knowledge',
                description: registrySkill.description,
              },
              triggers: { keywords: registrySkill.keywords },
            });
        }
      }

      const skillPath = path.join(skillsDir, registrySkill.path);
      await fs.writeFile(skillPath, yaml.stringify(skill));
    }
  }

  return { registryPath, skillsDir };
}

/**
 * Get the local URL for a mock registry
 */
export function getMockRegistryUrl(skillsDir: string): string {
  return skillsDir;
}

/**
 * Add a skill to an existing mock registry
 */
export async function addSkillToMockRegistry(
  skillsDir: string,
  registrySkill: RegistrySkill,
  skill: Skill
): Promise<void> {
  // Update registry.json
  const registryPath = path.join(skillsDir, 'registry.json');
  const registryContent = await fs.readFile(registryPath, 'utf-8');
  const registry: Registry = JSON.parse(registryContent);

  // Remove existing skill with same name if present
  registry.skills = registry.skills.filter(s => s.name !== registrySkill.name);
  registry.skills.push(registrySkill);
  registry.updated = new Date().toISOString();

  await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));

  // Create skill file
  const skillDir = path.join(skillsDir, path.dirname(registrySkill.path));
  await fs.ensureDir(skillDir);

  const skillPath = path.join(skillsDir, registrySkill.path);
  await fs.writeFile(skillPath, yaml.stringify(skill));
}

/**
 * Remove a skill from an existing mock registry
 */
export async function removeSkillFromMockRegistry(
  skillsDir: string,
  skillName: string
): Promise<void> {
  // Update registry.json
  const registryPath = path.join(skillsDir, 'registry.json');
  const registryContent = await fs.readFile(registryPath, 'utf-8');
  const registry: Registry = JSON.parse(registryContent);

  const skill = registry.skills.find(s => s.name === skillName);
  if (skill) {
    registry.skills = registry.skills.filter(s => s.name !== skillName);
    registry.updated = new Date().toISOString();

    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));

    // Remove skill directory
    const skillDirPath = path.join(skillsDir, path.dirname(skill.path));
    await fs.remove(skillDirPath);
  }
}

/**
 * Create a simple single-skill mock registry
 */
export async function createSimpleMockRegistry(
  env: TestEnvironment,
  skill: Skill,
  registrySkill?: Partial<RegistrySkill>
): Promise<{ registryPath: string; skillsDir: string }> {
  const fullRegistrySkill = createTestRegistrySkill({
    name: skill.meta.name,
    version: skill.meta.version,
    type: skill.meta.type,
    description: skill.meta.description,
    path: `${skill.meta.name}/${skill.meta.name}.uasp.yaml`,
    keywords: skill.triggers?.keywords || [],
    ...registrySkill,
  });

  return createMockRegistry(env, {
    skills: [fullRegistrySkill],
    skillData: { [skill.meta.name]: skill },
  });
}

/**
 * Verify registry structure is valid
 */
export async function verifyMockRegistry(skillsDir: string): Promise<boolean> {
  const registryPath = path.join(skillsDir, 'registry.json');

  if (!await fs.pathExists(registryPath)) {
    return false;
  }

  try {
    const content = await fs.readFile(registryPath, 'utf-8');
    const registry: Registry = JSON.parse(content);

    if (!registry.version || !registry.skills || !Array.isArray(registry.skills)) {
      return false;
    }

    // Verify each skill file exists
    for (const skill of registry.skills) {
      const skillPath = path.join(skillsDir, skill.path);
      if (!await fs.pathExists(skillPath)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}
