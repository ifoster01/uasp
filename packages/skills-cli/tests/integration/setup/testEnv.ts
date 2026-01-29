/**
 * Test environment management for integration tests
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export interface TestEnvironment {
  /** Temporary home directory for tests */
  homeDir: string;
  /** Temporary project directory for tests */
  projectDir: string;
  /** Path to ~/.agents in test env */
  agentsDir: string;
  /** Path to ~/.agents/skills in test env */
  agentsSkillsDir: string;
  /** Path to ~/.claude in test env */
  claudeDir: string;
  /** Path to ~/.claude/skills in test env */
  claudeSkillsDir: string;
  /** Path to .agent in project dir */
  projectAgentDir: string;
  /** Path to .agent/skills in project dir */
  projectSkillsDir: string;
  /** Path to .agent/settings.json in project dir */
  settingsPath: string;
  /** Path to ~/.agents/.skill-lock.json in test env */
  lockFilePath: string;
}

/**
 * Create an isolated test environment with temp directories
 */
export async function createTestEnvironment(testName: string): Promise<TestEnvironment> {
  const timestamp = Date.now();
  const baseDir = path.join(os.tmpdir(), `skills-cli-test-${testName}-${timestamp}`);

  const homeDir = path.join(baseDir, 'home');
  const projectDir = path.join(baseDir, 'project');

  const agentsDir = path.join(homeDir, '.agents');
  const agentsSkillsDir = path.join(agentsDir, 'skills');
  const claudeDir = path.join(homeDir, '.claude');
  const claudeSkillsDir = path.join(claudeDir, 'skills');
  const projectAgentDir = path.join(projectDir, '.agent');
  const projectSkillsDir = path.join(projectAgentDir, 'skills');
  const settingsPath = path.join(projectAgentDir, 'settings.json');
  const lockFilePath = path.join(agentsDir, '.skill-lock.json');

  // Create all directories
  await fs.ensureDir(homeDir);
  await fs.ensureDir(projectDir);
  await fs.ensureDir(agentsDir);
  await fs.ensureDir(agentsSkillsDir);
  await fs.ensureDir(claudeDir);
  await fs.ensureDir(claudeSkillsDir);
  await fs.ensureDir(projectAgentDir);
  await fs.ensureDir(projectSkillsDir);

  return {
    homeDir,
    projectDir,
    agentsDir,
    agentsSkillsDir,
    claudeDir,
    claudeSkillsDir,
    projectAgentDir,
    projectSkillsDir,
    settingsPath,
    lockFilePath,
  };
}

/**
 * Clean up a test environment
 */
export async function cleanupTestEnvironment(env: TestEnvironment): Promise<void> {
  // Get the base directory (parent of homeDir)
  const baseDir = path.dirname(env.homeDir);

  try {
    await fs.remove(baseDir);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Write a file in the test environment
 */
export async function writeTestFile(
  env: TestEnvironment,
  relativePath: string,
  content: string,
  base: 'home' | 'project' = 'project'
): Promise<string> {
  const basePath = base === 'home' ? env.homeDir : env.projectDir;
  const fullPath = path.join(basePath, relativePath);

  await fs.ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, content);

  return fullPath;
}

/**
 * Read a file from the test environment
 */
export async function readTestFile(
  env: TestEnvironment,
  relativePath: string,
  base: 'home' | 'project' = 'project'
): Promise<string> {
  const basePath = base === 'home' ? env.homeDir : env.projectDir;
  const fullPath = path.join(basePath, relativePath);

  return fs.readFile(fullPath, 'utf-8');
}

/**
 * Check if a file exists in the test environment
 */
export async function testFileExists(
  env: TestEnvironment,
  relativePath: string,
  base: 'home' | 'project' = 'project'
): Promise<boolean> {
  const basePath = base === 'home' ? env.homeDir : env.projectDir;
  const fullPath = path.join(basePath, relativePath);

  return fs.pathExists(fullPath);
}

/**
 * Check if a path is a symlink in the test environment
 */
export async function isTestSymlink(
  env: TestEnvironment,
  relativePath: string,
  base: 'home' | 'project' = 'home'
): Promise<boolean> {
  const basePath = base === 'home' ? env.homeDir : env.projectDir;
  const fullPath = path.join(basePath, relativePath);

  try {
    const stat = await fs.lstat(fullPath);
    return stat.isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Get symlink target in the test environment
 */
export async function getTestSymlinkTarget(
  env: TestEnvironment,
  relativePath: string,
  base: 'home' | 'project' = 'home'
): Promise<string | null> {
  const basePath = base === 'home' ? env.homeDir : env.projectDir;
  const fullPath = path.join(basePath, relativePath);

  try {
    return await fs.readlink(fullPath);
  } catch {
    return null;
  }
}

/**
 * List files in a directory in the test environment
 */
export async function listTestDir(
  env: TestEnvironment,
  relativePath: string,
  base: 'home' | 'project' = 'project'
): Promise<string[]> {
  const basePath = base === 'home' ? env.homeDir : env.projectDir;
  const fullPath = path.join(basePath, relativePath);

  try {
    return await fs.readdir(fullPath);
  } catch {
    return [];
  }
}
