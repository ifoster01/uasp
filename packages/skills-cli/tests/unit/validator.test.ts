/**
 * Unit tests for validator.ts
 */

import { describe, it, expect } from 'vitest';
import { validateSkill, isValidSkillStructure } from '../../src/core/validator.js';
import { createMinimalSkill, createCliSkill } from '../setup.js';

describe('validator', () => {
  describe('validateSkill', () => {
    describe('valid skills', () => {
      it('should validate a minimal knowledge skill', () => {
        const skill = createMinimalSkill();
        const result = validateSkill(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate a CLI skill with commands', () => {
        const skill = createCliSkill();
        const result = validateSkill(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate a skill with triggers', () => {
        const skill = createMinimalSkill({
          triggers: {
            keywords: ['test', 'example'],
            intents: ['do something', 'perform action'],
            file_patterns: ['*.ts', '*.js'],
          },
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate a skill with constraints', () => {
        const skill = createMinimalSkill({
          constraints: {
            never: ['do bad things'],
            always: ['do good things'],
            prefer: [
              { use: 'option A', over: 'option B', when: 'condition X' },
              { use: 'option C', over: 'option D' },
            ],
          },
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate a skill with decisions', () => {
        const skill = createMinimalSkill({
          decisions: [
            { when: 'condition A', then: 'action A', ref: 'some-ref' },
            { when: 'condition B', then: 'action B' },
          ],
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate a skill with state entities', () => {
        const skill = createMinimalSkill({
          state: {
            entities: [
              {
                name: 'refs',
                format: '@e{n}',
                created_by: ['snapshot'],
                consumed_by: ['click', 'fill'],
                invalidated_by: ['navigation'],
                properties: ['id', 'type'],
                persisted_by: ['save'],
                restored_by: ['load'],
              },
            ],
          },
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate a skill with global flags', () => {
        const skill = createCliSkill({
          global_flags: [
            { name: '--verbose', short: '-v', type: 'bool', purpose: 'verbose output' },
            { name: '--config', type: 'string', env: 'CONFIG_PATH' },
          ],
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate a skill with workflows', () => {
        const skill = createCliSkill({
          workflows: {
            basic: {
              description: 'Basic workflow',
              invariants: ['must be valid'],
              steps: [
                { cmd: 'command1', note: 'first step' },
                { cmd: 'command2', optional: true },
              ],
              example: 'example usage',
            },
          },
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate a skill with reference entries', () => {
        const skill = createMinimalSkill({
          reference: {
            config: {
              syntax: 'key=value',
              notes: 'Configuration format',
              example: 'debug=true',
            },
            options: {
              values: ['opt1', 'opt2'],
            },
          },
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate a skill with templates', () => {
        const skill = createMinimalSkill({
          templates: {
            basic: {
              description: 'Basic template',
              usage: './basic.sh <arg>',
              args: [{ name: 'arg', type: 'string', required: true }],
              path: 'templates/basic.sh',
            },
          },
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate a skill with environment variables', () => {
        const skill = createMinimalSkill({
          environment: [
            { name: 'API_KEY', purpose: 'API authentication', default: '' },
            { name: 'DEBUG', purpose: 'Enable debug mode' },
          ],
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate a skill with sources', () => {
        const skill = createMinimalSkill({
          sources: [
            { id: 'docs', url: 'https://example.com/docs', use_for: 'documentation' },
            { id: 'local', path: 'references/guide.md', use_for: 'local reference' },
          ],
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate all valid skill types', () => {
        const types = ['knowledge', 'cli', 'api', 'hybrid'] as const;

        for (const type of types) {
          const skill = {
            meta: {
              name: 'test-skill',
              version: '1.0.0',
              type,
              description: 'A test skill',
            },
          };
          const result = validateSkill(skill);

          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      });

      it('should validate a complete CLI skill with all sections', () => {
        const skill = {
          meta: {
            name: 'complete-cli-skill',
            version: '1.0.0',
            type: 'cli',
            description: 'A complete CLI skill for testing',
          },
          triggers: {
            keywords: ['test', 'complete'],
            intents: ['test completely'],
          },
          constraints: {
            never: ['skip validation'],
            always: ['validate first'],
            prefer: [{ use: 'safe mode', over: 'fast mode' }],
          },
          decisions: [
            { when: 'error occurs', then: 'log and retry' },
          ],
          state: {
            entities: [{ name: 'context', created_by: ['init'] }],
          },
          commands: {
            init: {
              syntax: 'complete-cli-skill init',
              description: 'Initialize',
              creates: ['context'],
            },
            run: {
              syntax: 'complete-cli-skill run <target>',
              args: [{ name: 'target', type: 'string', required: true }],
              flags: [{ name: '--dry-run', type: 'bool' }],
              requires: ['context'],
            },
          },
          global_flags: [
            { name: '--debug', type: 'bool', purpose: 'debug mode' },
          ],
          workflows: {
            full: {
              description: 'Full workflow',
              steps: [
                { cmd: 'init' },
                { cmd: 'run target' },
              ],
            },
          },
          environment: [
            { name: 'DEBUG', purpose: 'enable debug' },
          ],
          sources: [
            { id: 'docs', url: 'https://example.com', use_for: 'docs' },
          ],
        };

        const result = validateSkill(skill);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('invalid skills', () => {
      it('should reject a skill without meta section', () => {
        const skill = { triggers: { keywords: ['test'] } };
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(e => e.includes('meta'))).toBe(true);
      });

      it('should reject a skill without meta.name', () => {
        const skill = {
          meta: {
            version: '1.0.0',
            type: 'knowledge',
          },
        };
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('name'))).toBe(true);
      });

      it('should reject a skill without meta.version', () => {
        const skill = {
          meta: {
            name: 'test-skill',
            type: 'knowledge',
          },
        };
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('version'))).toBe(true);
      });

      it('should reject a skill without meta.type', () => {
        const skill = {
          meta: {
            name: 'test-skill',
            version: '1.0.0',
          },
        };
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('type'))).toBe(true);
      });

      it('should reject an invalid skill type', () => {
        const skill = {
          meta: {
            name: 'test-skill',
            version: '1.0.0',
            type: 'invalid',
            description: 'A test skill',
          },
        };
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('type'))).toBe(true);
      });

      it('should reject a skill name with invalid pattern', () => {
        const invalidNames = [
          'UPPERCASE',
          '123-starts-with-number',
          'has_underscore',
          'has spaces',
          'has.dots',
          '',
        ];

        for (const name of invalidNames) {
          const skill = {
            meta: {
              name,
              version: '1.0.0',
              type: 'knowledge',
              description: 'A test skill',
            },
          };
          const result = validateSkill(skill);

          expect(result.valid).toBe(false);
        }
      });

      it('should accept valid skill name patterns', () => {
        const validNames = [
          'simple',
          'with-dashes',
          'a1',
          'skill-123',
          'my-long-skill-name',
        ];

        for (const name of validNames) {
          const skill = {
            meta: {
              name,
              version: '1.0.0',
              type: 'knowledge',
              description: 'A test skill',
            },
          };
          const result = validateSkill(skill);

          expect(result.valid).toBe(true);
        }
      });

      it('should reject a description longer than 500 characters', () => {
        const longDescription = 'a'.repeat(501);
        const skill = {
          meta: {
            name: 'test-skill',
            version: '1.0.0',
            type: 'knowledge',
            description: longDescription,
          },
        };
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('description') || e.includes('maxLength'))).toBe(true);
      });

      it('should accept a description of exactly 500 characters', () => {
        const maxDescription = 'a'.repeat(500);
        const skill = {
          meta: {
            name: 'test-skill',
            version: '1.0.0',
            type: 'knowledge',
            description: maxDescription,
          },
        };
        const result = validateSkill(skill);

        expect(result.valid).toBe(true);
      });

      it('should reject invalid preference structure', () => {
        const skill = createMinimalSkill({
          constraints: {
            prefer: [
              { use: 'option A' }, // missing 'over'
            ],
          },
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('over'))).toBe(true);
      });

      it('should reject invalid decision structure', () => {
        const skill = createMinimalSkill({
          decisions: [
            { when: 'condition' }, // missing 'then'
          ],
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('then'))).toBe(true);
      });

      it('should reject command without syntax', () => {
        const skill = createCliSkill({
          commands: {
            invalid: {
              description: 'Missing syntax',
            },
          },
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('syntax'))).toBe(true);
      });

      it('should reject workflow without description', () => {
        const skill = createCliSkill({
          workflows: {
            invalid: {
              steps: [{ cmd: 'test' }],
            },
          },
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('description'))).toBe(true);
      });

      it('should reject workflow without steps', () => {
        const skill = createCliSkill({
          workflows: {
            invalid: {
              description: 'Missing steps',
            },
          },
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('steps'))).toBe(true);
      });

      it('should reject workflow step without cmd', () => {
        const skill = createCliSkill({
          workflows: {
            invalid: {
              description: 'Invalid step',
              steps: [{ note: 'missing cmd' }],
            },
          },
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('cmd'))).toBe(true);
      });

      it('should reject argument without name', () => {
        const skill = createCliSkill({
          commands: {
            test: {
              syntax: 'test <arg>',
              args: [{ type: 'string' }], // missing name
            },
          },
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('name'))).toBe(true);
      });

      it('should reject argument without type', () => {
        const skill = createCliSkill({
          commands: {
            test: {
              syntax: 'test <arg>',
              args: [{ name: 'arg' }], // missing type
            },
          },
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('type'))).toBe(true);
      });

      it('should reject flag without name', () => {
        const skill = createCliSkill({
          commands: {
            test: {
              syntax: 'test --flag',
              flags: [{ type: 'bool' }], // missing name
            },
          },
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('name'))).toBe(true);
      });

      it('should reject flag without type', () => {
        const skill = createCliSkill({
          commands: {
            test: {
              syntax: 'test --flag',
              flags: [{ name: '--flag' }], // missing type
            },
          },
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('type'))).toBe(true);
      });

      it('should reject template without description', () => {
        const skill = createMinimalSkill({
          templates: {
            invalid: {
              path: 'templates/invalid.sh',
            },
          },
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('description'))).toBe(true);
      });

      it('should reject environment variable without name', () => {
        const skill = createMinimalSkill({
          environment: [{ purpose: 'missing name' }],
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('name'))).toBe(true);
      });

      it('should reject environment variable without purpose', () => {
        const skill = createMinimalSkill({
          environment: [{ name: 'VAR' }],
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('purpose'))).toBe(true);
      });

      it('should reject source without id', () => {
        const skill = createMinimalSkill({
          sources: [{ url: 'https://example.com' }],
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('id'))).toBe(true);
      });

      it('should reject state entity without name', () => {
        const skill = createMinimalSkill({
          state: {
            entities: [{ format: '@e{n}' }],
          },
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('name'))).toBe(true);
      });

      it('should reject non-object skill', () => {
        expect(validateSkill(null).valid).toBe(false);
        expect(validateSkill(undefined).valid).toBe(false);
        expect(validateSkill('string').valid).toBe(false);
        expect(validateSkill(123).valid).toBe(false);
        expect(validateSkill([]).valid).toBe(false);
      });
    });

    describe('error messages', () => {
      it('should provide path information in error messages', () => {
        const skill = createMinimalSkill({
          commands: {
            test: {
              description: 'no syntax',
            },
          },
        });
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('/commands/test'))).toBe(true);
      });

      it('should list all validation errors', () => {
        const skill = {
          meta: {
            name: 'INVALID',
            // missing version and type
          },
        };
        const result = validateSkill(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });
    });
  });

  describe('isValidSkillStructure', () => {
    it('should return true for valid minimal structure', () => {
      const skill = createMinimalSkill();
      expect(isValidSkillStructure(skill)).toBe(true);
    });

    it('should return true for all valid types', () => {
      const types = ['knowledge', 'cli', 'api', 'hybrid'] as const;

      for (const type of types) {
        const skill = {
          meta: {
            name: 'test-skill',
            version: '1.0.0',
            type,
            description: 'A test skill',
          },
        };
        expect(isValidSkillStructure(skill)).toBe(true);
      }
    });

    it('should return false for null', () => {
      expect(isValidSkillStructure(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidSkillStructure(undefined)).toBe(false);
    });

    it('should return false for non-object types', () => {
      expect(isValidSkillStructure('string')).toBe(false);
      expect(isValidSkillStructure(123)).toBe(false);
      expect(isValidSkillStructure(true)).toBe(false);
      expect(isValidSkillStructure([])).toBe(false);
    });

    it('should return false for object without meta', () => {
      expect(isValidSkillStructure({})).toBe(false);
      expect(isValidSkillStructure({ triggers: {} })).toBe(false);
    });

    it('should return false for non-object meta', () => {
      expect(isValidSkillStructure({ meta: 'string' })).toBe(false);
      expect(isValidSkillStructure({ meta: null })).toBe(false);
      expect(isValidSkillStructure({ meta: 123 })).toBe(false);
    });

    it('should return false for meta without name', () => {
      const skill = { meta: { version: '1.0.0', type: 'knowledge' } };
      expect(isValidSkillStructure(skill)).toBe(false);
    });

    it('should return false for meta without version', () => {
      const skill = { meta: { name: 'test', type: 'knowledge' } };
      expect(isValidSkillStructure(skill)).toBe(false);
    });

    it('should return false for meta without type', () => {
      const skill = { meta: { name: 'test', version: '1.0.0' } };
      expect(isValidSkillStructure(skill)).toBe(false);
    });

    it('should return false for invalid type value', () => {
      const skill = { meta: { name: 'test', version: '1.0.0', type: 'invalid' } };
      expect(isValidSkillStructure(skill)).toBe(false);
    });

    it('should return false for non-string meta fields', () => {
      expect(isValidSkillStructure({ meta: { name: 123, version: '1.0.0', type: 'knowledge' } })).toBe(false);
      expect(isValidSkillStructure({ meta: { name: 'test', version: 123, type: 'knowledge' } })).toBe(false);
      expect(isValidSkillStructure({ meta: { name: 'test', version: '1.0.0', type: 123 } })).toBe(false);
    });

    it('should work as type guard', () => {
      const unknown: unknown = createMinimalSkill();

      if (isValidSkillStructure(unknown)) {
        // TypeScript should recognize this as Skill type
        expect(unknown.meta.name).toBeDefined();
        expect(unknown.meta.version).toBeDefined();
        expect(unknown.meta.type).toBeDefined();
      }
    });
  });
});
