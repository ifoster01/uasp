/**
 * Conversion benchmarks - UASP to SKILL.md and file size comparison
 */

import { benchmark, type BenchmarkResult, type BenchmarkOptions, formatBytes } from './metrics.js';
import { convertToSkillMd } from '../core/installer.js';
import type { Skill, RegistrySkill } from '../types/index.js';

export interface FileSizeComparison {
  uaspBytes: number;
  skillMdBytes: number;
  ratio: number;
  uaspFormatted: string;
  skillMdFormatted: string;
}

/**
 * Calculate file sizes
 */
export function calculateFileSizes(uaspContent: string, skillMdContent: string): FileSizeComparison {
  const uaspBytes = Buffer.byteLength(uaspContent, 'utf-8');
  const skillMdBytes = Buffer.byteLength(skillMdContent, 'utf-8');

  return {
    uaspBytes,
    skillMdBytes,
    ratio: skillMdBytes / uaspBytes,
    uaspFormatted: formatBytes(uaspBytes),
    skillMdFormatted: formatBytes(skillMdBytes),
  };
}

/**
 * Benchmark UASP to SKILL.md conversion
 */
export async function benchmarkConversion(
  skill: Skill,
  registrySkill: RegistrySkill,
  options?: BenchmarkOptions
): Promise<BenchmarkResult> {
  return benchmark('UASP to SKILL.md', () => convertToSkillMd(skill, registrySkill), options);
}

/**
 * Calculate feature coverage score
 * Measures how many UASP features are preserved in SKILL.md conversion
 */
export function calculateFeatureCoverage(skill: Skill, skillMdContent: string): number {
  let totalFeatures = 0;
  let coveredFeatures = 0;

  // Meta (always present)
  totalFeatures += 4; // name, version, type, description
  coveredFeatures += 4; // Always included

  // Triggers
  if (skill.triggers) {
    if (skill.triggers.keywords?.length) {
      totalFeatures += 1;
      if (skillMdContent.includes('## Keywords')) coveredFeatures += 1;
    }
    if (skill.triggers.intents?.length) {
      totalFeatures += 1;
      if (skillMdContent.includes('## Intents')) coveredFeatures += 1;
    }
    if (skill.triggers.file_patterns?.length) {
      totalFeatures += 1;
      // file_patterns are not typically included in SKILL.md
      coveredFeatures += 0;
    }
  }

  // Constraints
  if (skill.constraints) {
    if (skill.constraints.never?.length) {
      totalFeatures += 1;
      if (skillMdContent.includes('### Never')) coveredFeatures += 1;
    }
    if (skill.constraints.always?.length) {
      totalFeatures += 1;
      if (skillMdContent.includes('### Always')) coveredFeatures += 1;
    }
    if (skill.constraints.prefer?.length) {
      totalFeatures += 1;
      if (skillMdContent.includes('### Preferences')) coveredFeatures += 1;
    }
  }

  // Decisions
  if (skill.decisions?.length) {
    totalFeatures += 1;
    if (skillMdContent.includes('## Decisions')) coveredFeatures += 1;
  }

  // State
  if (skill.state?.entities?.length) {
    totalFeatures += 1;
    // State entities are not typically converted
    coveredFeatures += 0;
  }

  // Commands
  if (skill.commands && Object.keys(skill.commands).length > 0) {
    totalFeatures += 1;
    if (skillMdContent.includes('## Commands')) coveredFeatures += 1;
  }

  // Global flags
  if (skill.global_flags?.length) {
    totalFeatures += 1;
    // Global flags are partially included in commands
    coveredFeatures += 0.5;
  }

  // Workflows
  if (skill.workflows && Object.keys(skill.workflows).length > 0) {
    totalFeatures += 1;
    if (skillMdContent.includes('## Workflows')) coveredFeatures += 1;
  }

  // Reference
  if (skill.reference && Object.keys(skill.reference).length > 0) {
    totalFeatures += 1;
    // Reference sections are not typically converted
    coveredFeatures += 0;
  }

  // Templates
  if (skill.templates && Object.keys(skill.templates).length > 0) {
    totalFeatures += 1;
    // Templates are not typically converted
    coveredFeatures += 0;
  }

  // Environment
  if (skill.environment?.length) {
    totalFeatures += 1;
    // Environment is not typically converted
    coveredFeatures += 0;
  }

  // Sources
  if (skill.sources?.length) {
    totalFeatures += 1;
    if (skillMdContent.includes('## References')) coveredFeatures += 1;
  }

  return totalFeatures > 0 ? (coveredFeatures / totalFeatures) * 100 : 100;
}

/**
 * Run conversion benchmarks
 */
export async function runConversionBenchmarks(
  skill: Skill,
  registrySkill: RegistrySkill,
  uaspContent: string,
  options?: BenchmarkOptions
): Promise<{
  conversion: BenchmarkResult;
  fileSize: FileSizeComparison;
  featureCoverage: number;
}> {
  const conversion = await benchmarkConversion(skill, registrySkill, options);

  // Generate SKILL.md for size comparison
  const skillMdContent = convertToSkillMd(skill, registrySkill);
  const fileSize = calculateFileSizes(uaspContent, skillMdContent);
  const featureCoverage = calculateFeatureCoverage(skill, skillMdContent);

  return { conversion, fileSize, featureCoverage };
}
