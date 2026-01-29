/**
 * Test fixture creators for integration tests
 */

import type { Skill, RegistrySkill, Registry, SkillsConfig, InstalledSkill } from '../../../src/types/index.js';

/**
 * Create a minimal UASP skill for testing
 */
export function createTestSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    meta: {
      name: 'test-skill',
      version: 'abc12345',
      type: 'knowledge',
      description: 'A test skill for integration testing',
      ...overrides.meta,
    },
    triggers: {
      keywords: ['test', 'integration'],
      intents: ['test something'],
      ...overrides.triggers,
    },
    constraints: {
      never: ['do bad things'],
      always: ['do good things'],
      ...overrides.constraints,
    },
    ...overrides,
  };
}

/**
 * Create a CLI UASP skill with commands
 */
export function createTestCliSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    meta: {
      name: 'test-cli-skill',
      version: 'def67890',
      type: 'cli',
      description: 'A test CLI skill for integration testing',
      ...overrides.meta,
    },
    triggers: {
      keywords: ['test', 'cli'],
      intents: ['run test commands'],
      ...overrides.triggers,
    },
    commands: {
      run: {
        syntax: 'test-cli-skill run <file>',
        description: 'Run a test',
        args: [
          { name: 'file', type: 'string', required: true },
        ],
        flags: [
          { name: '--verbose', short: '-v', type: 'bool', purpose: 'Verbose output' },
        ],
      },
      list: {
        syntax: 'test-cli-skill list',
        description: 'List tests',
        returns: 'List of test files',
      },
      ...overrides.commands,
    },
    global_flags: overrides.global_flags || [
      { name: '--config', type: 'string', purpose: 'Config file path' },
    ],
    workflows: {
      basic: {
        description: 'Basic test workflow',
        steps: [
          { cmd: 'list', note: 'Find tests' },
          { cmd: 'run <file>', note: 'Run test' },
        ],
      },
      ...overrides.workflows,
    },
    ...overrides,
  };
}

/**
 * Create a hybrid UASP skill
 */
export function createTestHybridSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    meta: {
      name: 'test-hybrid-skill',
      version: 'ghi11223',
      type: 'hybrid',
      description: 'A test hybrid skill for integration testing',
      ...overrides.meta,
    },
    triggers: {
      keywords: ['test', 'hybrid'],
      ...overrides.triggers,
    },
    constraints: {
      prefer: [
        { use: 'automatic', over: 'manual', when: 'possible' },
      ],
      ...overrides.constraints,
    },
    commands: {
      process: {
        syntax: 'test-hybrid-skill process <input>',
        args: [{ name: 'input', type: 'string', required: true }],
      },
      ...overrides.commands,
    },
    reference: {
      config: {
        syntax: 'key=value',
        notes: 'Configuration format',
      },
      ...overrides.reference,
    },
    sources: overrides.sources || [
      { id: 'docs', url: 'https://example.com/docs', use_for: 'documentation' },
    ],
    ...overrides,
  };
}

/**
 * Create a registry skill entry
 */
export function createTestRegistrySkill(overrides: Partial<RegistrySkill> = {}): RegistrySkill {
  return {
    name: 'test-skill',
    version: 'abc12345',
    type: 'knowledge',
    description: 'A test skill for integration testing',
    path: 'test-skill/test-skill.uasp.yaml',
    keywords: ['test', 'integration'],
    author: 'test-author',
    license: 'MIT',
    ...overrides,
  };
}

/**
 * Create a registry with multiple skills
 */
export function createTestRegistry(skills?: RegistrySkill[]): Registry {
  return {
    $schema: 'https://uasp.dev/schema/v1/registry.json',
    version: '1.0.0',
    updated: new Date().toISOString(),
    repository: 'https://github.com/test/test-skills',
    skills: skills || [
      createTestRegistrySkill(),
      createTestRegistrySkill({
        name: 'test-cli-skill',
        version: 'def67890',
        type: 'cli',
        description: 'A test CLI skill',
        path: 'test-cli-skill/test-cli-skill.uasp.yaml',
        keywords: ['test', 'cli'],
      }),
      createTestRegistrySkill({
        name: 'test-hybrid-skill',
        version: 'ghi11223',
        type: 'hybrid',
        description: 'A test hybrid skill',
        path: 'test-hybrid-skill/test-hybrid-skill.uasp.yaml',
        keywords: ['test', 'hybrid'],
      }),
    ],
  };
}

/**
 * Create an installed skill entry
 */
export function createTestInstalledSkill(overrides: Partial<InstalledSkill> = {}): InstalledSkill {
  return {
    name: 'test-skill',
    version: 'abc12345',
    type: 'knowledge',
    path: '.agent/skills/test-skill/test-skill.uasp.yaml',
    enabled: true,
    installedAt: new Date().toISOString(),
    source: 'test-owner/test-repo/skills',
    ...overrides,
  };
}

/**
 * Create a skills config (settings.json)
 */
export function createTestSkillsConfig(overrides: Partial<SkillsConfig> = {}): SkillsConfig {
  return {
    version: '1.0.0',
    skills: {
      installed: [],
      ...overrides.skills,
    },
    triggers: {
      keywords: {},
      filePatterns: {},
      ...overrides.triggers,
    },
    ...overrides,
  };
}

/**
 * Create a Claude Code lock file
 */
export function createTestLockFile(skills: Record<string, any> = {}): any {
  return {
    version: 3,
    skills: {
      ...skills,
    },
  };
}

/**
 * Serialize a skill to YAML string
 */
export function skillToYaml(skill: Skill): string {
  const yaml = require('yaml');
  return yaml.stringify(skill);
}

/**
 * Create SKILL.md frontmatter content
 */
export function createTestSkillMd(
  name: string,
  type: 'knowledge' | 'cli' | 'hybrid' = 'knowledge',
  description: string = 'A test skill'
): string {
  const lines: string[] = [
    '---',
    `name: ${name}`,
    `description: ${description}`,
  ];

  if (type === 'cli') {
    lines.push(`allowed-tools: Bash(${name}:*)`);
  }

  lines.push('metadata:');
  lines.push('  version: "1.0.0"');
  lines.push(`  type: ${type}`);
  lines.push('  format: uasp');
  lines.push('---');
  lines.push('');
  lines.push(`# ${name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`);
  lines.push('');
  lines.push(description);
  lines.push('');
  lines.push('## Keywords');
  lines.push('');
  lines.push('test, integration');
  lines.push('');

  return lines.join('\n');
}
