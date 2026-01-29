/**
 * Global test setup for skills-cli
 */

import { vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';

// Store original environment
const originalEnv = { ...process.env };
const originalCwd = process.cwd();

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  // Restore original environment
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

/**
 * Create a mock HOME directory path for testing
 */
export function getMockHomeDir(): string {
  return path.join(os.tmpdir(), 'skills-cli-test-home');
}

/**
 * Create a mock project directory path for testing
 */
export function getMockProjectDir(): string {
  return path.join(os.tmpdir(), 'skills-cli-test-project');
}

/**
 * Helper to create valid minimal skill object
 */
export function createMinimalSkill(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    meta: {
      name: 'test-skill',
      version: '1.0.0',
      type: 'knowledge',
      description: 'A test skill',
      ...((overrides.meta as Record<string, unknown>) || {}),
    },
    ...overrides,
  };
}

/**
 * Helper to create CLI skill object with commands
 */
export function createCliSkill(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    meta: {
      name: 'test-cli-skill',
      version: '1.0.0',
      type: 'cli',
      description: 'A test CLI skill',
      ...((overrides.meta as Record<string, unknown>) || {}),
    },
    commands: {
      run: {
        syntax: 'test-cli-skill run <arg>',
        args: [
          { name: 'arg', type: 'string', required: true },
        ],
      },
      ...((overrides.commands as Record<string, unknown>) || {}),
    },
    ...overrides,
  };
}

/**
 * Helper to create a valid registry object
 */
export function createRegistry(skills: Array<Record<string, unknown>> = []): Record<string, unknown> {
  return {
    version: '1.0.0',
    updated: new Date().toISOString(),
    repository: 'https://github.com/test/test',
    skills: skills.length > 0 ? skills : [
      {
        name: 'test-skill',
        version: '1.0.0',
        type: 'knowledge',
        description: 'A test skill',
        path: 'test-skill/test-skill.uasp.yaml',
        keywords: ['test', 'example'],
      },
    ],
  };
}

/**
 * Helper to create a registry skill object
 */
export function createRegistrySkill(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'test-skill',
    version: '1.0.0',
    type: 'knowledge',
    description: 'A test skill',
    path: 'test-skill/test-skill.uasp.yaml',
    keywords: ['test', 'example'],
    ...overrides,
  };
}

/**
 * Helper to create a GitHub source object
 */
export function createGitHubSource(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    owner: 'test-owner',
    repo: 'test-repo',
    path: 'skills',
    ref: 'main',
    ...overrides,
  };
}
