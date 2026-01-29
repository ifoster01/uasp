/**
 * Unit tests for registry.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseRegistry, findSkill, searchSkills, loadRegistry, getGitHubSource } from '../../src/core/registry.js';
import { createRegistry, createRegistrySkill } from '../setup.js';

// Mock the github module
vi.mock('../../src/core/github.js', () => ({
  parseGitHubUrl: vi.fn((url: string) => {
    if (url.includes('invalid')) return null;
    if (url.startsWith('/') || url.startsWith('./')) {
      return { owner: 'local', repo: 'local', path: '', ref: 'local', isLocal: true, localPath: url };
    }
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match) {
      return { owner: match[1], repo: match[2], path: '', ref: 'main' };
    }
    if (url.startsWith('github:')) {
      const parts = url.slice(7).split('/');
      return { owner: parts[0], repo: parts[1], path: parts.slice(2).join('/'), ref: 'main' };
    }
    return null;
  }),
  fetchRegistry: vi.fn(),
}));

import { parseGitHubUrl, fetchRegistry } from '../../src/core/github.js';

describe('registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseRegistry', () => {
    it('should parse valid registry JSON', () => {
      const registry = createRegistry();
      const content = JSON.stringify(registry);

      const result = parseRegistry(content);

      expect(result.version).toBe('1.0.0');
      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].name).toBe('test-skill');
    });

    it('should parse registry with multiple skills', () => {
      const skills = [
        createRegistrySkill({ name: 'skill-1' }),
        createRegistrySkill({ name: 'skill-2' }),
        createRegistrySkill({ name: 'skill-3' }),
      ];
      const registry = createRegistry(skills as Array<Record<string, unknown>>);
      const content = JSON.stringify(registry);

      const result = parseRegistry(content);

      expect(result.skills).toHaveLength(3);
      expect(result.skills.map(s => s.name)).toEqual(['skill-1', 'skill-2', 'skill-3']);
    });

    it('should preserve all registry fields', () => {
      const registry = {
        $schema: 'https://uasp.dev/schema/v1/registry.json',
        version: '2.0.0',
        updated: '2026-01-29T00:00:00Z',
        repository: 'https://github.com/test/repo',
        skills: [
          {
            name: 'full-skill',
            version: 'abc123',
            type: 'cli',
            description: 'A full skill',
            path: 'full-skill/full-skill.uasp.yaml',
            keywords: ['test', 'full'],
            author: 'test-author',
            license: 'MIT',
            homepage: 'https://example.com',
            dependencies: ['dep-1', 'dep-2'],
          },
        ],
      };
      const content = JSON.stringify(registry);

      const result = parseRegistry(content);

      expect(result.$schema).toBe('https://uasp.dev/schema/v1/registry.json');
      expect(result.version).toBe('2.0.0');
      expect(result.updated).toBe('2026-01-29T00:00:00Z');
      expect(result.repository).toBe('https://github.com/test/repo');
      expect(result.skills[0].author).toBe('test-author');
      expect(result.skills[0].license).toBe('MIT');
      expect(result.skills[0].homepage).toBe('https://example.com');
      expect(result.skills[0].dependencies).toEqual(['dep-1', 'dep-2']);
    });

    it('should throw on invalid JSON', () => {
      const invalidJson = '{ invalid json }';

      expect(() => parseRegistry(invalidJson)).toThrow('Invalid JSON in registry');
    });

    it('should throw on JSON without version', () => {
      const noVersion = JSON.stringify({ skills: [] });

      expect(() => parseRegistry(noVersion)).toThrow('Invalid registry format');
    });

    it('should throw on JSON without skills', () => {
      const noSkills = JSON.stringify({ version: '1.0.0' });

      expect(() => parseRegistry(noSkills)).toThrow('Invalid registry format');
    });

    it('should throw on JSON with non-array skills', () => {
      const invalidSkills = JSON.stringify({ version: '1.0.0', skills: {} });

      expect(() => parseRegistry(invalidSkills)).toThrow('Invalid registry format');
    });

    it('should handle empty skills array', () => {
      const emptySkills = JSON.stringify({ version: '1.0.0', skills: [], updated: '', repository: '' });

      const result = parseRegistry(emptySkills);

      expect(result.skills).toHaveLength(0);
    });

    it('should throw descriptive error on syntax error', () => {
      const badJson = '{"version": }';

      expect(() => parseRegistry(badJson)).toThrow(/Invalid JSON/);
    });
  });

  describe('findSkill', () => {
    it('should find skill by exact name', () => {
      const registry = parseRegistry(JSON.stringify(createRegistry([
        createRegistrySkill({ name: 'my-skill' }) as Record<string, unknown>,
        createRegistrySkill({ name: 'other-skill' }) as Record<string, unknown>,
      ])));

      const result = findSkill(registry, 'my-skill');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('my-skill');
    });

    it('should return null for non-existent skill', () => {
      const registry = parseRegistry(JSON.stringify(createRegistry()));

      const result = findSkill(registry, 'non-existent');

      expect(result).toBeNull();
    });

    it('should be case-sensitive', () => {
      const registry = parseRegistry(JSON.stringify(createRegistry([
        createRegistrySkill({ name: 'my-skill' }) as Record<string, unknown>,
      ])));

      expect(findSkill(registry, 'My-Skill')).toBeNull();
      expect(findSkill(registry, 'MY-SKILL')).toBeNull();
      expect(findSkill(registry, 'my-skill')).not.toBeNull();
    });

    it('should return first match if duplicates exist', () => {
      const registry = parseRegistry(JSON.stringify(createRegistry([
        createRegistrySkill({ name: 'dup-skill', version: '1.0.0' }) as Record<string, unknown>,
        createRegistrySkill({ name: 'dup-skill', version: '2.0.0' }) as Record<string, unknown>,
      ])));

      const result = findSkill(registry, 'dup-skill');

      expect(result?.version).toBe('1.0.0');
    });

    it('should return null for empty registry', () => {
      const registry = parseRegistry(JSON.stringify({ version: '1.0.0', skills: [], updated: '', repository: '' }));

      const result = findSkill(registry, 'any-skill');

      expect(result).toBeNull();
    });

    it('should handle partial name matches (not match)', () => {
      const registry = parseRegistry(JSON.stringify(createRegistry([
        createRegistrySkill({ name: 'my-skill-extended' }) as Record<string, unknown>,
      ])));

      expect(findSkill(registry, 'my-skill')).toBeNull();
      expect(findSkill(registry, 'skill')).toBeNull();
    });
  });

  describe('searchSkills', () => {
    const createSearchableRegistry = () => parseRegistry(JSON.stringify(createRegistry([
      createRegistrySkill({
        name: 'browser-automation',
        description: 'Automate browser interactions',
        keywords: ['browser', 'web', 'scrape'],
      }) as Record<string, unknown>,
      createRegistrySkill({
        name: 'payment-integration',
        description: 'Integrate Stripe payments',
        keywords: ['stripe', 'payment', 'billing'],
      }) as Record<string, unknown>,
      createRegistrySkill({
        name: 'diagram-creator',
        description: 'Create software diagrams',
        keywords: ['diagram', 'mermaid', 'flowchart'],
      }) as Record<string, unknown>,
    ])));

    it('should search by skill name', () => {
      const registry = createSearchableRegistry();

      const results = searchSkills(registry, 'browser');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('browser-automation');
    });

    it('should search by description', () => {
      const registry = createSearchableRegistry();

      const results = searchSkills(registry, 'stripe');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('payment-integration');
    });

    it('should search by keywords', () => {
      const registry = createSearchableRegistry();

      const results = searchSkills(registry, 'mermaid');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('diagram-creator');
    });

    it('should be case-insensitive', () => {
      const registry = createSearchableRegistry();

      expect(searchSkills(registry, 'BROWSER')).toHaveLength(1);
      expect(searchSkills(registry, 'Browser')).toHaveLength(1);
      expect(searchSkills(registry, 'bRoWsEr')).toHaveLength(1);
    });

    it('should return multiple matches', () => {
      const registry = parseRegistry(JSON.stringify(createRegistry([
        createRegistrySkill({ name: 'skill-one', description: 'first skill', keywords: ['test'] }) as Record<string, unknown>,
        createRegistrySkill({ name: 'skill-two', description: 'second test skill', keywords: ['example'] }) as Record<string, unknown>,
        createRegistrySkill({ name: 'test-three', description: 'third skill', keywords: ['demo'] }) as Record<string, unknown>,
      ])));

      const results = searchSkills(registry, 'test');

      expect(results).toHaveLength(3);
    });

    it('should return empty array for no matches', () => {
      const registry = createSearchableRegistry();

      const results = searchSkills(registry, 'nonexistent');

      expect(results).toHaveLength(0);
    });

    it('should match partial strings', () => {
      const registry = createSearchableRegistry();

      expect(searchSkills(registry, 'auto')).toHaveLength(1); // browser-automation
      expect(searchSkills(registry, 'pay')).toHaveLength(1);  // payment-integration
      expect(searchSkills(registry, 'dia')).toHaveLength(1);  // diagram-creator
    });

    it('should handle empty query', () => {
      const registry = createSearchableRegistry();

      // Empty string matches all
      const results = searchSkills(registry, '');

      expect(results).toHaveLength(3);
    });

    it('should handle special characters in query', () => {
      const registry = parseRegistry(JSON.stringify(createRegistry([
        createRegistrySkill({ name: 'my-skill', description: 'skill with (parentheses)', keywords: ['test'] }) as Record<string, unknown>,
      ])));

      const results = searchSkills(registry, '(');

      expect(results).toHaveLength(1);
    });

    it('should match across all searchable fields', () => {
      const registry = parseRegistry(JSON.stringify(createRegistry([
        createRegistrySkill({
          name: 'unique-name',
          description: 'unique-description',
          keywords: ['unique-keyword'],
        }) as Record<string, unknown>,
      ])));

      expect(searchSkills(registry, 'unique-name')).toHaveLength(1);
      expect(searchSkills(registry, 'unique-description')).toHaveLength(1);
      expect(searchSkills(registry, 'unique-keyword')).toHaveLength(1);
    });
  });

  describe('loadRegistry', () => {
    it('should load and parse registry from valid URL', async () => {
      const mockRegistry = createRegistry();
      vi.mocked(fetchRegistry).mockResolvedValue(JSON.stringify(mockRegistry));

      const result = await loadRegistry('https://github.com/test/repo');

      expect(parseGitHubUrl).toHaveBeenCalledWith('https://github.com/test/repo');
      expect(fetchRegistry).toHaveBeenCalled();
      expect(result.version).toBe('1.0.0');
    });

    it('should throw on invalid URL', async () => {
      await expect(loadRegistry('invalid-url')).rejects.toThrow('Invalid GitHub URL');
    });

    it('should propagate fetch errors', async () => {
      vi.mocked(fetchRegistry).mockRejectedValue(new Error('Network error'));

      await expect(loadRegistry('https://github.com/test/repo')).rejects.toThrow('Network error');
    });

    it('should propagate parse errors', async () => {
      vi.mocked(fetchRegistry).mockResolvedValue('{ invalid json }');

      await expect(loadRegistry('https://github.com/test/repo')).rejects.toThrow('Invalid JSON');
    });
  });

  describe('getGitHubSource', () => {
    it('should return source for valid GitHub URL', () => {
      const source = getGitHubSource('https://github.com/owner/repo');

      expect(source.owner).toBe('owner');
      expect(source.repo).toBe('repo');
    });

    it('should throw for invalid URL', () => {
      expect(() => getGitHubSource('invalid-url')).toThrow('Invalid GitHub URL');
    });

    it('should handle github: shorthand', () => {
      const source = getGitHubSource('github:owner/repo/path');

      expect(source.owner).toBe('owner');
      expect(source.repo).toBe('repo');
      expect(source.path).toBe('path');
    });

    it('should handle local paths', () => {
      const source = getGitHubSource('/local/path');

      expect(source.isLocal).toBe(true);
      expect(source.localPath).toBe('/local/path');
    });
  });
});
