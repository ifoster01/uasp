/**
 * Registry management for UASP skills
 */

import type { Registry, RegistrySkill } from '../types/index.js';
import { parseGitHubUrl, fetchRegistry, type GitHubSource } from './github.js';

/**
 * Parse registry JSON content
 */
export function parseRegistry(content: string): Registry {
  try {
    const registry = JSON.parse(content) as Registry;

    // Validate required fields
    if (!registry.version || !registry.skills || !Array.isArray(registry.skills)) {
      throw new Error('Invalid registry format: missing required fields');
    }

    return registry;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in registry: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Find a skill in the registry by name
 */
export function findSkill(registry: Registry, skillName: string): RegistrySkill | null {
  return registry.skills.find((s) => s.name === skillName) || null;
}

/**
 * Search skills by keyword
 */
export function searchSkills(registry: Registry, query: string): RegistrySkill[] {
  const lowerQuery = query.toLowerCase();

  return registry.skills.filter((skill) => {
    // Match against name
    if (skill.name.toLowerCase().includes(lowerQuery)) return true;

    // Match against description
    if (skill.description.toLowerCase().includes(lowerQuery)) return true;

    // Match against keywords
    if (skill.keywords.some((k) => k.toLowerCase().includes(lowerQuery))) return true;

    return false;
  });
}

/**
 * Load registry from a GitHub URL
 */
export async function loadRegistry(url: string): Promise<Registry> {
  const source = parseGitHubUrl(url);
  if (!source) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }

  const content = await fetchRegistry(source);
  return parseRegistry(content);
}

/**
 * Get the GitHub source for a registry URL
 */
export function getGitHubSource(url: string): GitHubSource {
  const source = parseGitHubUrl(url);
  if (!source) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }
  return source;
}
