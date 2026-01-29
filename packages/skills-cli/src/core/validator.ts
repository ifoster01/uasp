/**
 * UASP Skill validation using JSON Schema
 */

import Ajv, { type ErrorObject } from 'ajv';
import type { Skill } from '../types/index.js';

// Ajv default export handling for ESM
const AjvClass = Ajv.default || Ajv;

// JSON Schema for UASP skills (ported from Python)
const skillSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://uasp.dev/schema/v1/skill.json',
  title: 'UASP Skill Definition',
  type: 'object',
  required: ['meta'],
  properties: {
    meta: { $ref: '#/definitions/Meta' },
    triggers: { $ref: '#/definitions/Triggers' },
    constraints: { $ref: '#/definitions/Constraints' },
    decisions: { $ref: '#/definitions/Decisions' },
    state: { $ref: '#/definitions/State' },
    commands: { $ref: '#/definitions/Commands' },
    global_flags: { $ref: '#/definitions/GlobalFlags' },
    workflows: { $ref: '#/definitions/Workflows' },
    reference: { $ref: '#/definitions/Reference' },
    templates: { $ref: '#/definitions/Templates' },
    environment: { $ref: '#/definitions/Environment' },
    sources: { $ref: '#/definitions/Sources' },
  },
  definitions: {
    Meta: {
      type: 'object',
      required: ['name', 'version', 'type'],
      properties: {
        name: {
          type: 'string',
          pattern: '^[a-z][a-z0-9-]*$',
          description: 'Unique skill identifier',
        },
        version: {
          type: 'string',
          description: 'Content hash of the skill definition',
        },
        type: {
          type: 'string',
          enum: ['knowledge', 'cli', 'api', 'hybrid'],
          description: 'Primary skill type',
        },
        description: {
          type: 'string',
          maxLength: 500,
          description: 'Brief description for skill discovery',
        },
      },
    },
    Triggers: {
      type: 'object',
      properties: {
        keywords: {
          type: 'array',
          items: { type: 'string' },
        },
        intents: {
          type: 'array',
          items: { type: 'string' },
        },
        file_patterns: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    Constraints: {
      type: 'object',
      properties: {
        never: {
          type: 'array',
          items: { type: 'string' },
        },
        always: {
          type: 'array',
          items: { type: 'string' },
        },
        prefer: {
          type: 'array',
          items: { $ref: '#/definitions/Preference' },
        },
      },
    },
    Preference: {
      type: 'object',
      required: ['use', 'over'],
      properties: {
        use: { type: 'string' },
        over: { type: 'string' },
        when: { type: 'string' },
      },
    },
    Decisions: {
      type: 'array',
      items: { $ref: '#/definitions/Decision' },
    },
    Decision: {
      type: 'object',
      required: ['when', 'then'],
      properties: {
        when: { type: 'string' },
        then: { type: 'string' },
        ref: { type: 'string' },
      },
    },
    State: {
      type: 'object',
      properties: {
        entities: {
          type: 'array',
          items: { $ref: '#/definitions/StateEntity' },
        },
      },
    },
    StateEntity: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        format: { type: 'string' },
        created_by: { type: 'array', items: { type: 'string' } },
        consumed_by: { type: 'array', items: { type: 'string' } },
        invalidated_by: { type: 'array', items: { type: 'string' } },
        properties: { type: 'array', items: { type: 'string' } },
        persisted_by: { type: 'array', items: { type: 'string' } },
        restored_by: { type: 'array', items: { type: 'string' } },
      },
    },
    Commands: {
      type: 'object',
      additionalProperties: { $ref: '#/definitions/Command' },
    },
    Command: {
      type: 'object',
      required: ['syntax'],
      properties: {
        syntax: { type: 'string' },
        description: { type: 'string' },
        aliases: { type: 'array', items: { type: 'string' } },
        args: { type: 'array', items: { $ref: '#/definitions/Argument' } },
        flags: { type: 'array', items: { $ref: '#/definitions/Flag' } },
        returns: { type: 'string' },
        requires: { type: 'array', items: { type: 'string' } },
        creates: { type: 'array', items: { type: 'string' } },
        invalidates: { type: 'array', items: { type: 'string' } },
        note: { type: 'string' },
        variants: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              syntax: { type: 'string' },
              purpose: { type: 'string' },
            },
          },
        },
        example: { type: 'string' },
      },
    },
    Argument: {
      type: 'object',
      required: ['name', 'type'],
      properties: {
        name: { type: 'string' },
        type: { type: 'string' },
        required: { type: 'boolean' },
        default: {},
        description: { type: 'string' },
        values: { type: 'array', items: { type: 'string' } },
      },
    },
    Flag: {
      type: 'object',
      required: ['name', 'type'],
      properties: {
        name: { type: 'string' },
        short: { type: 'string' },
        long: { type: 'string' },
        type: { type: 'string' },
        default: {},
        purpose: { type: 'string' },
        env: { type: 'string' },
      },
    },
    GlobalFlags: {
      type: 'array',
      items: { $ref: '#/definitions/Flag' },
    },
    Workflows: {
      type: 'object',
      additionalProperties: { $ref: '#/definitions/Workflow' },
    },
    Workflow: {
      type: 'object',
      required: ['description', 'steps'],
      properties: {
        description: { type: 'string' },
        invariants: { type: 'array', items: { type: 'string' } },
        steps: { type: 'array', items: { $ref: '#/definitions/WorkflowStep' } },
        example: { type: 'string' },
      },
    },
    WorkflowStep: {
      type: 'object',
      required: ['cmd'],
      properties: {
        cmd: { type: 'string' },
        note: { type: 'string' },
        optional: { type: 'boolean' },
      },
    },
    Reference: {
      type: 'object',
      additionalProperties: { $ref: '#/definitions/ReferenceEntry' },
    },
    ReferenceEntry: {
      type: 'object',
      properties: {
        syntax: { type: 'string' },
        example: { type: 'string' },
        notes: { type: 'string' },
        values: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: true,
    },
    Templates: {
      type: 'object',
      additionalProperties: { $ref: '#/definitions/Template' },
    },
    Template: {
      type: 'object',
      required: ['description'],
      properties: {
        description: { type: 'string' },
        usage: { type: 'string' },
        args: { type: 'array', items: { $ref: '#/definitions/Argument' } },
        path: { type: 'string' },
        inline: { type: 'string' },
      },
    },
    Environment: {
      type: 'array',
      items: { $ref: '#/definitions/EnvironmentVar' },
    },
    EnvironmentVar: {
      type: 'object',
      required: ['name', 'purpose'],
      properties: {
        name: { type: 'string' },
        purpose: { type: 'string' },
        default: { type: 'string' },
      },
    },
    Sources: {
      type: 'array',
      items: { $ref: '#/definitions/Source' },
    },
    Source: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        url: { type: 'string' },
        path: { type: 'string' },
        use_for: { type: 'string' },
      },
    },
  },
};

// Create validator instance
const ajv = new AjvClass({ allErrors: true });
const validate = ajv.compile(skillSchema);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a skill object against the UASP schema
 */
export function validateSkill(skill: unknown): ValidationResult {
  const valid = validate(skill);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors = (validate.errors || []).map((err: ErrorObject) => {
    const path = err.instancePath || '/';
    const message = err.message || 'Unknown error';
    return `${path}: ${message}`;
  });

  return { valid: false, errors };
}

/**
 * Check if a skill object has the minimum required structure
 */
export function isValidSkillStructure(skill: unknown): skill is Skill {
  if (typeof skill !== 'object' || skill === null) {
    return false;
  }

  const obj = skill as Record<string, unknown>;

  // Must have meta section
  if (!obj.meta || typeof obj.meta !== 'object') {
    return false;
  }

  const meta = obj.meta as Record<string, unknown>;

  // Meta must have name, version, type
  if (
    typeof meta.name !== 'string' ||
    typeof meta.version !== 'string' ||
    typeof meta.type !== 'string'
  ) {
    return false;
  }

  // Type must be valid
  const validTypes = ['knowledge', 'cli', 'api', 'hybrid'];
  if (!validTypes.includes(meta.type)) {
    return false;
  }

  return true;
}
