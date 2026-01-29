/**
 * Parsing benchmarks - YAML vs Frontmatter
 */

import yaml from 'yaml';
import { benchmark, type BenchmarkResult, type BenchmarkOptions } from './metrics.js';

/**
 * Parse UASP YAML content
 */
export function parseUaspYaml(content: string): unknown {
  return yaml.parse(content);
}

/**
 * Parse SKILL.md frontmatter (simple implementation without gray-matter for comparison)
 */
export function parseSkillMdFrontmatter(content: string): { data: unknown; content: string } {
  // Extract frontmatter between --- delimiters
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return { data: {}, content };
  }

  const [, frontmatterStr, body] = match;
  const data = yaml.parse(frontmatterStr);

  return { data, content: body };
}

/**
 * Parse SKILL.md frontmatter using gray-matter (if available)
 */
export async function parseSkillMdWithGrayMatter(content: string): Promise<{ data: unknown; content: string }> {
  try {
    const matter = await import('gray-matter');
    const result = matter.default(content);
    return { data: result.data, content: result.content };
  } catch {
    // gray-matter not installed, use simple parser
    return parseSkillMdFrontmatter(content);
  }
}

/**
 * Benchmark UASP YAML parsing
 */
export async function benchmarkUaspParsing(
  content: string,
  options?: BenchmarkOptions
): Promise<BenchmarkResult> {
  return benchmark('UASP YAML', () => parseUaspYaml(content), options);
}

/**
 * Benchmark SKILL.md frontmatter parsing
 */
export async function benchmarkSkillMdParsing(
  content: string,
  options?: BenchmarkOptions
): Promise<BenchmarkResult> {
  return benchmark('SKILL.md Frontmatter', () => parseSkillMdFrontmatter(content), options);
}

/**
 * Benchmark SKILL.md parsing with gray-matter
 */
export async function benchmarkSkillMdGrayMatter(
  content: string,
  options?: BenchmarkOptions
): Promise<BenchmarkResult> {
  // Pre-import gray-matter to avoid import overhead in benchmark
  let matterFn: ((content: string) => { data: unknown; content: string }) | null = null;
  try {
    const matterModule = await import('gray-matter');
    // Handle both ESM default export and CommonJS
    matterFn = (matterModule.default || matterModule) as (content: string) => { data: unknown; content: string };
  } catch {
    // Not available
  }

  if (!matterFn) {
    return benchmark('SKILL.md (gray-matter)', () => parseSkillMdFrontmatter(content), options);
  }

  const fn = matterFn;
  return benchmark('SKILL.md (gray-matter)', () => {
    return fn(content);
  }, options);
}

/**
 * Run all parsing benchmarks
 */
export async function runParsingBenchmarks(
  uaspContent: string,
  skillMdContent: string,
  options?: BenchmarkOptions
): Promise<{ uasp: BenchmarkResult; skillMd: BenchmarkResult }> {
  const uasp = await benchmarkUaspParsing(uaspContent, options);
  const skillMd = await benchmarkSkillMdGrayMatter(skillMdContent, options);

  return { uasp, skillMd };
}
