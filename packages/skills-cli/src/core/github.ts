/**
 * GitHub integration for fetching skills
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

export interface GitHubSource {
  owner: string;
  repo: string;
  path: string;
  ref: string;
  isLocal?: boolean;
  localPath?: string;
}

/**
 * Parse a GitHub URL or local path into components
 * Supports formats:
 * - https://github.com/owner/repo/tree/branch/path
 * - https://github.com/owner/repo/path (assumes main branch)
 * - github:owner/repo/path
 * - file:///absolute/path (local file)
 * - /absolute/path (local file)
 * - ./relative/path (local file)
 */
export function parseGitHubUrl(url: string): GitHubSource | null {
  // Handle local file paths
  if (url.startsWith('file://') || url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    const localPath = url.startsWith('file://') ? url.slice(7) : url;
    return {
      owner: 'local',
      repo: 'local',
      path: '',
      ref: 'local',
      isLocal: true,
      localPath: path.resolve(localPath),
    };
  }

  // Handle github: shorthand
  if (url.startsWith('github:')) {
    const parts = url.slice(7).split('/');
    if (parts.length < 2) return null;
    const [owner, repo, ...pathParts] = parts;
    return {
      owner,
      repo,
      path: pathParts.join('/') || '',
      ref: 'main',
    };
  }

  // Handle full GitHub URLs
  const match = url.match(
    /github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?(?:\/(.*))?/
  );

  if (!match) return null;

  const [, owner, repo, ref = 'main', pathStr = ''] = match;
  return { owner, repo, path: pathStr, ref };
}

/**
 * Build a raw GitHub URL for fetching file content
 */
export function buildRawUrl(source: GitHubSource, filePath: string): string {
  const fullPath = source.path ? `${source.path}/${filePath}` : filePath;
  return `https://raw.githubusercontent.com/${source.owner}/${source.repo}/${source.ref}/${fullPath}`;
}

/**
 * Fetch a file from GitHub or local filesystem
 */
export async function fetchFromGitHub(
  source: GitHubSource,
  filePath: string
): Promise<string> {
  // Handle local files
  if (source.isLocal && source.localPath) {
    const fullPath = path.join(source.localPath, filePath);
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read local file ${fullPath}: ${(error as Error).message}`);
    }
  }

  // Handle remote files
  const url = buildRawUrl(source, filePath);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

/**
 * Fetch the registry.json from a GitHub repository
 */
export async function fetchRegistry(source: GitHubSource): Promise<string> {
  return fetchFromGitHub(source, 'registry.json');
}

/**
 * Fetch a skill file from a GitHub repository
 */
export async function fetchSkillFile(
  source: GitHubSource,
  skillPath: string
): Promise<string> {
  return fetchFromGitHub(source, skillPath);
}
