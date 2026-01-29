/**
 * Validation benchmarks - AJV schema vs loose validation
 */

import { benchmark, type BenchmarkResult, type BenchmarkOptions } from './metrics.js';
import { validateSkill, isValidSkillStructure } from '../core/validator.js';

/**
 * Loose validation for SKILL.md frontmatter
 * Mimics what Claude Code might do to validate a skill
 */
export function validateSkillMdLoose(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Data must be an object'] };
  }

  const obj = data as Record<string, unknown>;

  // Required fields
  if (typeof obj.name !== 'string' || !obj.name) {
    errors.push('Missing or invalid name');
  }

  if (typeof obj.description !== 'string') {
    errors.push('Missing or invalid description');
  }

  // Optional but validated if present
  if (obj['allowed-tools'] !== undefined && typeof obj['allowed-tools'] !== 'string') {
    errors.push('allowed-tools must be a string');
  }

  if (obj.metadata !== undefined) {
    if (typeof obj.metadata !== 'object') {
      errors.push('metadata must be an object');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Benchmark UASP schema validation with AJV
 */
export async function benchmarkUaspValidation(
  skill: unknown,
  options?: BenchmarkOptions
): Promise<BenchmarkResult> {
  return benchmark('UASP AJV Schema', () => validateSkill(skill), options);
}

/**
 * Benchmark UASP type guard validation
 */
export async function benchmarkUaspTypeGuard(
  skill: unknown,
  options?: BenchmarkOptions
): Promise<BenchmarkResult> {
  return benchmark('UASP Type Guard', () => isValidSkillStructure(skill), options);
}

/**
 * Benchmark loose SKILL.md validation
 */
export async function benchmarkSkillMdValidation(
  frontmatter: unknown,
  options?: BenchmarkOptions
): Promise<BenchmarkResult> {
  return benchmark('SKILL.md Loose', () => validateSkillMdLoose(frontmatter), options);
}

/**
 * Run all validation benchmarks
 */
export async function runValidationBenchmarks(
  uaspSkill: unknown,
  skillMdFrontmatter: unknown,
  options?: BenchmarkOptions
): Promise<{ uasp: BenchmarkResult; skillMd: BenchmarkResult }> {
  const uasp = await benchmarkUaspValidation(uaspSkill, options);
  const skillMd = await benchmarkSkillMdValidation(skillMdFrontmatter, options);

  return { uasp, skillMd };
}
