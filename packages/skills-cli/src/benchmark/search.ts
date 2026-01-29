/**
 * Search benchmarks - Structured vs full-text search
 */

import { benchmark, type BenchmarkResult, type BenchmarkOptions } from './metrics.js';
import type { Registry, RegistrySkill, Skill } from '../types/index.js';

/**
 * Structured search on UASP registry
 * Searches specific fields: name, description, keywords
 */
export function searchUaspStructured(
  skills: Array<{ skill: Skill; registrySkill: RegistrySkill }>,
  query: string
): Array<{ skill: Skill; registrySkill: RegistrySkill; score: number }> {
  const lowerQuery = query.toLowerCase();
  const results: Array<{ skill: Skill; registrySkill: RegistrySkill; score: number }> = [];

  for (const { skill, registrySkill } of skills) {
    let score = 0;

    // Name match (highest weight)
    if (skill.meta.name.toLowerCase().includes(lowerQuery)) {
      score += 10;
    }

    // Description match
    if (skill.meta.description?.toLowerCase().includes(lowerQuery)) {
      score += 5;
    }

    // Keyword match
    if (skill.triggers?.keywords?.some(k => k.toLowerCase().includes(lowerQuery))) {
      score += 8;
    }

    // Intent match
    if (skill.triggers?.intents?.some(i => i.toLowerCase().includes(lowerQuery))) {
      score += 6;
    }

    // Registry keyword match
    if (registrySkill.keywords.some(k => k.toLowerCase().includes(lowerQuery))) {
      score += 7;
    }

    if (score > 0) {
      results.push({ skill, registrySkill, score });
    }
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Full-text search on SKILL.md content
 */
export function searchSkillMdFullText(
  skillMdContents: Array<{ name: string; content: string }>,
  query: string
): Array<{ name: string; score: number }> {
  const lowerQuery = query.toLowerCase();
  const results: Array<{ name: string; score: number }> = [];

  for (const { name, content } of skillMdContents) {
    const lowerContent = content.toLowerCase();

    // Count occurrences
    let count = 0;
    let index = 0;
    while ((index = lowerContent.indexOf(lowerQuery, index)) !== -1) {
      count++;
      index += lowerQuery.length;
    }

    if (count > 0) {
      // Score based on occurrences and position
      const firstIndex = lowerContent.indexOf(lowerQuery);
      const positionBonus = firstIndex < 500 ? 2 : 1; // Boost if found early

      results.push({
        name,
        score: count * positionBonus,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Benchmark structured UASP search
 */
export async function benchmarkUaspSearch(
  skills: Array<{ skill: Skill; registrySkill: RegistrySkill }>,
  query: string,
  options?: BenchmarkOptions
): Promise<BenchmarkResult> {
  return benchmark(
    'UASP Structured Search',
    () => searchUaspStructured(skills, query),
    options
  );
}

/**
 * Benchmark full-text SKILL.md search
 */
export async function benchmarkSkillMdSearch(
  skillMdContents: Array<{ name: string; content: string }>,
  query: string,
  options?: BenchmarkOptions
): Promise<BenchmarkResult> {
  return benchmark(
    'SKILL.md Full-text Search',
    () => searchSkillMdFullText(skillMdContents, query),
    options
  );
}

/**
 * Calculate search precision
 * Measures how relevant the top N results are
 */
export function calculateSearchPrecision(
  results: Array<{ name: string; score: number }>,
  expectedTopResults: string[],
  topN: number = 3
): number {
  const topResults = results.slice(0, topN).map(r => r.name);
  const relevant = topResults.filter(r => expectedTopResults.includes(r));
  return relevant.length / Math.min(topN, results.length);
}

/**
 * Run search benchmarks
 */
export async function runSearchBenchmarks(
  skills: Array<{ skill: Skill; registrySkill: RegistrySkill }>,
  skillMdContents: Array<{ name: string; content: string }>,
  query: string,
  options?: BenchmarkOptions
): Promise<{ uasp: BenchmarkResult; skillMd: BenchmarkResult }> {
  const uasp = await benchmarkUaspSearch(skills, query, options);
  const skillMd = await benchmarkSkillMdSearch(skillMdContents, query, options);

  return { uasp, skillMd };
}
