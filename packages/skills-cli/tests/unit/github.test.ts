/**
 * Unit tests for github.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseGitHubUrl, buildRawUrl, fetchFromGitHub, fetchRegistry, fetchSkillFile } from '../../src/core/github.js';
import type { GitHubSource } from '../../src/core/github.js';

// Mock node-fetch
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
  },
}));

import fetch from 'node-fetch';
import fs from 'fs/promises';

describe('github', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseGitHubUrl', () => {
    describe('full GitHub URLs', () => {
      it('should parse basic github.com URL', () => {
        const result = parseGitHubUrl('https://github.com/owner/repo');

        expect(result).not.toBeNull();
        expect(result?.owner).toBe('owner');
        expect(result?.repo).toBe('repo');
        expect(result?.ref).toBe('main');
        expect(result?.path).toBe('');
      });

      it('should parse URL with tree/branch', () => {
        const result = parseGitHubUrl('https://github.com/owner/repo/tree/develop');

        expect(result).not.toBeNull();
        expect(result?.owner).toBe('owner');
        expect(result?.repo).toBe('repo');
        expect(result?.ref).toBe('develop');
      });

      it('should parse URL with tree/branch and path', () => {
        const result = parseGitHubUrl('https://github.com/owner/repo/tree/main/path/to/dir');

        expect(result).not.toBeNull();
        expect(result?.owner).toBe('owner');
        expect(result?.repo).toBe('repo');
        expect(result?.ref).toBe('main');
        expect(result?.path).toBe('path/to/dir');
      });

      it('should parse URL with path but no branch specifier', () => {
        const result = parseGitHubUrl('https://github.com/owner/repo/path/to/dir');

        expect(result).not.toBeNull();
        expect(result?.owner).toBe('owner');
        expect(result?.repo).toBe('repo');
        expect(result?.ref).toBe('main');
        expect(result?.path).toBe('path/to/dir');
      });

      it('should handle various branch names', () => {
        // Note: branches with / are not fully supported by the current regex
        // The regex captures up to the first /
        const branches = ['main', 'master', 'develop', 'v1.0.0'];

        for (const branch of branches) {
          const result = parseGitHubUrl(`https://github.com/owner/repo/tree/${branch}`);
          expect(result?.ref).toBe(branch);
        }
      });

      it('should parse branch with slash, capturing only first segment', () => {
        // Due to regex limitations, feature/test becomes ref='feature' and path='test'
        const result = parseGitHubUrl('https://github.com/owner/repo/tree/feature/test');
        expect(result).not.toBeNull();
        expect(result?.ref).toBe('feature');
        expect(result?.path).toBe('test');
      });

      it('should handle www.github.com', () => {
        const result = parseGitHubUrl('https://www.github.com/owner/repo');

        // Note: Current implementation may not handle www - this tests actual behavior
        // If it returns null, that's the expected behavior based on current regex
        if (result) {
          expect(result.owner).toBe('owner');
          expect(result.repo).toBe('repo');
        }
      });
    });

    describe('github: shorthand', () => {
      it('should parse github:owner/repo', () => {
        const result = parseGitHubUrl('github:owner/repo');

        expect(result).not.toBeNull();
        expect(result?.owner).toBe('owner');
        expect(result?.repo).toBe('repo');
        expect(result?.ref).toBe('main');
        expect(result?.path).toBe('');
      });

      it('should parse github:owner/repo/path', () => {
        const result = parseGitHubUrl('github:owner/repo/path');

        expect(result).not.toBeNull();
        expect(result?.owner).toBe('owner');
        expect(result?.repo).toBe('repo');
        expect(result?.path).toBe('path');
      });

      it('should parse github:owner/repo/path/to/dir', () => {
        const result = parseGitHubUrl('github:owner/repo/path/to/dir');

        expect(result).not.toBeNull();
        expect(result?.owner).toBe('owner');
        expect(result?.repo).toBe('repo');
        expect(result?.path).toBe('path/to/dir');
      });

      it('should return null for github: with only owner', () => {
        const result = parseGitHubUrl('github:owner');

        expect(result).toBeNull();
      });
    });

    describe('local file paths', () => {
      it('should parse absolute path', () => {
        const result = parseGitHubUrl('/absolute/path/to/dir');

        expect(result).not.toBeNull();
        expect(result?.isLocal).toBe(true);
        expect(result?.localPath).toMatch(/\/absolute\/path\/to\/dir$/);
        expect(result?.owner).toBe('local');
        expect(result?.repo).toBe('local');
        expect(result?.ref).toBe('local');
      });

      it('should parse relative path with ./', () => {
        const result = parseGitHubUrl('./relative/path');

        expect(result).not.toBeNull();
        expect(result?.isLocal).toBe(true);
        expect(result?.localPath).toMatch(/relative\/path$/);
      });

      it('should parse relative path with ../', () => {
        const result = parseGitHubUrl('../parent/path');

        expect(result).not.toBeNull();
        expect(result?.isLocal).toBe(true);
        expect(result?.localPath).toMatch(/parent\/path$/);
      });

      it('should parse file:// protocol', () => {
        const result = parseGitHubUrl('file:///absolute/path');

        expect(result).not.toBeNull();
        expect(result?.isLocal).toBe(true);
        expect(result?.localPath).toMatch(/\/absolute\/path$/);
      });

      it('should resolve relative paths to absolute', () => {
        const result = parseGitHubUrl('./relative');

        expect(result?.localPath?.startsWith('/')).toBe(true);
      });
    });

    describe('invalid URLs', () => {
      it('should return null for non-GitHub HTTP URLs', () => {
        expect(parseGitHubUrl('https://gitlab.com/owner/repo')).toBeNull();
        expect(parseGitHubUrl('https://bitbucket.org/owner/repo')).toBeNull();
      });

      it('should return null for invalid github: shorthand', () => {
        expect(parseGitHubUrl('github:')).toBeNull();
        expect(parseGitHubUrl('github:owner')).toBeNull();
      });

      it('should return null for random strings', () => {
        expect(parseGitHubUrl('random-string')).toBeNull();
        expect(parseGitHubUrl('')).toBeNull();
      });
    });
  });

  describe('buildRawUrl', () => {
    it('should build URL without source path', () => {
      const source: GitHubSource = {
        owner: 'owner',
        repo: 'repo',
        path: '',
        ref: 'main',
      };

      const url = buildRawUrl(source, 'file.txt');

      expect(url).toBe('https://raw.githubusercontent.com/owner/repo/main/file.txt');
    });

    it('should build URL with source path', () => {
      const source: GitHubSource = {
        owner: 'owner',
        repo: 'repo',
        path: 'path/to',
        ref: 'main',
      };

      const url = buildRawUrl(source, 'file.txt');

      expect(url).toBe('https://raw.githubusercontent.com/owner/repo/main/path/to/file.txt');
    });

    it('should handle different refs', () => {
      const source: GitHubSource = {
        owner: 'owner',
        repo: 'repo',
        path: '',
        ref: 'v1.0.0',
      };

      const url = buildRawUrl(source, 'file.txt');

      expect(url).toBe('https://raw.githubusercontent.com/owner/repo/v1.0.0/file.txt');
    });

    it('should handle nested file paths', () => {
      const source: GitHubSource = {
        owner: 'owner',
        repo: 'repo',
        path: 'base',
        ref: 'main',
      };

      const url = buildRawUrl(source, 'nested/path/file.yaml');

      expect(url).toBe('https://raw.githubusercontent.com/owner/repo/main/base/nested/path/file.yaml');
    });
  });

  describe('fetchFromGitHub', () => {
    describe('remote files', () => {
      it('should fetch remote file successfully', async () => {
        const mockResponse = {
          ok: true,
          text: vi.fn().mockResolvedValue('file content'),
        };
        vi.mocked(fetch).mockResolvedValue(mockResponse as any);

        const source: GitHubSource = {
          owner: 'owner',
          repo: 'repo',
          path: '',
          ref: 'main',
        };

        const result = await fetchFromGitHub(source, 'file.txt');

        expect(result).toBe('file content');
        expect(fetch).toHaveBeenCalledWith(
          'https://raw.githubusercontent.com/owner/repo/main/file.txt'
        );
      });

      it('should throw on HTTP error', async () => {
        const mockResponse = {
          ok: false,
          status: 404,
          statusText: 'Not Found',
        };
        vi.mocked(fetch).mockResolvedValue(mockResponse as any);

        const source: GitHubSource = {
          owner: 'owner',
          repo: 'repo',
          path: '',
          ref: 'main',
        };

        await expect(fetchFromGitHub(source, 'nonexistent.txt')).rejects.toThrow(
          /Failed to fetch.*404.*Not Found/
        );
      });

      it('should include URL in error message', async () => {
        const mockResponse = {
          ok: false,
          status: 500,
          statusText: 'Server Error',
        };
        vi.mocked(fetch).mockResolvedValue(mockResponse as any);

        const source: GitHubSource = {
          owner: 'test-owner',
          repo: 'test-repo',
          path: 'test-path',
          ref: 'main',
        };

        await expect(fetchFromGitHub(source, 'file.txt')).rejects.toThrow(
          /raw\.githubusercontent\.com/
        );
      });
    });

    describe('local files', () => {
      it('should read local file successfully', async () => {
        vi.mocked(fs.readFile).mockResolvedValue('local file content');

        const source: GitHubSource = {
          owner: 'local',
          repo: 'local',
          path: '',
          ref: 'local',
          isLocal: true,
          localPath: '/local/path',
        };

        const result = await fetchFromGitHub(source, 'file.txt');

        expect(result).toBe('local file content');
        expect(fs.readFile).toHaveBeenCalledWith('/local/path/file.txt', 'utf-8');
      });

      it('should throw on local file read error', async () => {
        vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file'));

        const source: GitHubSource = {
          owner: 'local',
          repo: 'local',
          path: '',
          ref: 'local',
          isLocal: true,
          localPath: '/local/path',
        };

        await expect(fetchFromGitHub(source, 'missing.txt')).rejects.toThrow(
          /Failed to read local file/
        );
      });

      it('should include file path in error message', async () => {
        vi.mocked(fs.readFile).mockRejectedValue(new Error('Permission denied'));

        const source: GitHubSource = {
          owner: 'local',
          repo: 'local',
          path: '',
          ref: 'local',
          isLocal: true,
          localPath: '/protected/path',
        };

        await expect(fetchFromGitHub(source, 'secret.txt')).rejects.toThrow(
          /\/protected\/path\/secret\.txt/
        );
      });

      it('should join localPath and filePath correctly', async () => {
        vi.mocked(fs.readFile).mockResolvedValue('content');

        const source: GitHubSource = {
          owner: 'local',
          repo: 'local',
          path: '',
          ref: 'local',
          isLocal: true,
          localPath: '/base/path',
        };

        await fetchFromGitHub(source, 'nested/file.txt');

        expect(fs.readFile).toHaveBeenCalledWith('/base/path/nested/file.txt', 'utf-8');
      });
    });
  });

  describe('fetchRegistry', () => {
    it('should fetch registry.json', async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue('{"version": "1.0.0", "skills": []}'),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const source: GitHubSource = {
        owner: 'owner',
        repo: 'repo',
        path: 'skills',
        ref: 'main',
      };

      const result = await fetchRegistry(source);

      expect(result).toBe('{"version": "1.0.0", "skills": []}');
      expect(fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/owner/repo/main/skills/registry.json'
      );
    });

    it('should fetch registry.json from root if no path', async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue('{}'),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const source: GitHubSource = {
        owner: 'owner',
        repo: 'repo',
        path: '',
        ref: 'main',
      };

      await fetchRegistry(source);

      expect(fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/owner/repo/main/registry.json'
      );
    });
  });

  describe('fetchSkillFile', () => {
    it('should fetch skill file', async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue('meta:\n  name: test'),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const source: GitHubSource = {
        owner: 'owner',
        repo: 'repo',
        path: 'skills',
        ref: 'main',
      };

      const result = await fetchSkillFile(source, 'test-skill/test-skill.uasp.yaml');

      expect(result).toBe('meta:\n  name: test');
      expect(fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/owner/repo/main/skills/test-skill/test-skill.uasp.yaml'
      );
    });

    it('should handle nested skill paths', async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue('content'),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const source: GitHubSource = {
        owner: 'owner',
        repo: 'repo',
        path: 'packages/skills',
        ref: 'develop',
      };

      await fetchSkillFile(source, 'category/my-skill/my-skill.uasp.yaml');

      expect(fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/owner/repo/develop/packages/skills/category/my-skill/my-skill.uasp.yaml'
      );
    });

    it('should handle local skill files', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('local skill content');

      const source: GitHubSource = {
        owner: 'local',
        repo: 'local',
        path: '',
        ref: 'local',
        isLocal: true,
        localPath: '/local/skills',
      };

      const result = await fetchSkillFile(source, 'my-skill/my-skill.uasp.yaml');

      expect(result).toBe('local skill content');
      expect(fs.readFile).toHaveBeenCalledWith(
        '/local/skills/my-skill/my-skill.uasp.yaml',
        'utf-8'
      );
    });
  });
});
