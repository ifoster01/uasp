/**
 * Benchmark report generation in multiple formats
 */

import type { BenchmarkResult } from './metrics.js';
import { formatBytes, formatMs, compareBenchmarks } from './metrics.js';

export interface BenchmarkComparison {
  category: string;
  uasp: BenchmarkResult;
  skillMd: BenchmarkResult;
  winner: 'uasp' | 'skill-md' | 'tie';
  speedup: number;
}

export interface BenchmarkReport {
  title: string;
  timestamp: string;
  comparisons: BenchmarkComparison[];
  summary: {
    uaspWins: number;
    skillMdWins: number;
    ties: number;
  };
}

/**
 * Create a comparison between UASP and SKILL.md benchmarks
 */
export function createComparison(
  category: string,
  uasp: BenchmarkResult,
  skillMd: BenchmarkResult
): BenchmarkComparison {
  const comparison = compareBenchmarks(uasp, skillMd);

  let winner: 'uasp' | 'skill-md' | 'tie';
  let speedup: number;

  if (comparison.ratio < 1.05 && comparison.ratio > 0.95) {
    winner = 'tie';
    speedup = 1;
  } else if (comparison.winner === uasp.name) {
    winner = 'uasp';
    speedup = comparison.ratio;
  } else {
    winner = 'skill-md';
    speedup = comparison.ratio;
  }

  return { category, uasp, skillMd, winner, speedup };
}

/**
 * Create a full benchmark report
 */
export function createReport(comparisons: BenchmarkComparison[]): BenchmarkReport {
  const summary = {
    uaspWins: comparisons.filter(c => c.winner === 'uasp').length,
    skillMdWins: comparisons.filter(c => c.winner === 'skill-md').length,
    ties: comparisons.filter(c => c.winner === 'tie').length,
  };

  return {
    title: 'UASP vs SKILL.md Format Benchmark',
    timestamp: new Date().toISOString(),
    comparisons,
    summary,
  };
}

/**
 * Format report as console output
 */
export function formatConsoleReport(report: BenchmarkReport): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('═'.repeat(80));
  lines.push(`  ${report.title}`);
  lines.push(`  Generated: ${report.timestamp}`);
  lines.push('═'.repeat(80));
  lines.push('');

  // Table header
  lines.push('┌────────────────────┬───────────────┬───────────────┬──────────┬─────────┐');
  lines.push('│ Category           │ UASP          │ SKILL.md      │ Winner   │ Speedup │');
  lines.push('├────────────────────┼───────────────┼───────────────┼──────────┼─────────┤');

  for (const comp of report.comparisons) {
    const category = comp.category.padEnd(18);
    const uaspTime = formatMs(comp.uasp.timing.mean).padStart(11);
    const skillMdTime = formatMs(comp.skillMd.timing.mean).padStart(11);
    const winner = (comp.winner === 'tie' ? 'Tie' : comp.winner.toUpperCase()).padEnd(8);
    const speedup = comp.winner === 'tie' ? '   -   ' : `${comp.speedup.toFixed(2)}x`.padStart(7);

    lines.push(`│ ${category} │ ${uaspTime}   │ ${skillMdTime}   │ ${winner} │ ${speedup} │`);
  }

  lines.push('└────────────────────┴───────────────┴───────────────┴──────────┴─────────┘');
  lines.push('');

  // Summary
  lines.push('Summary:');
  lines.push(`  UASP wins:     ${report.summary.uaspWins}`);
  lines.push(`  SKILL.md wins: ${report.summary.skillMdWins}`);
  lines.push(`  Ties:          ${report.summary.ties}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Format report as JSON
 */
export function formatJsonReport(report: BenchmarkReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Format report as Markdown
 */
export function formatMarkdownReport(report: BenchmarkReport): string {
  const lines: string[] = [];

  lines.push(`# ${report.title}`);
  lines.push('');
  lines.push(`Generated: ${report.timestamp}`);
  lines.push('');

  // Table
  lines.push('| Category | UASP | SKILL.md | Winner | Speedup |');
  lines.push('|----------|------|----------|--------|---------|');

  for (const comp of report.comparisons) {
    const winner = comp.winner === 'tie' ? 'Tie' : comp.winner.toUpperCase();
    const speedup = comp.winner === 'tie' ? '-' : `${comp.speedup.toFixed(2)}x`;

    lines.push(`| ${comp.category} | ${formatMs(comp.uasp.timing.mean)} | ${formatMs(comp.skillMd.timing.mean)} | ${winner} | ${speedup} |`);
  }

  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **UASP wins:** ${report.summary.uaspWins}`);
  lines.push(`- **SKILL.md wins:** ${report.summary.skillMdWins}`);
  lines.push(`- **Ties:** ${report.summary.ties}`);
  lines.push('');

  // Detailed results
  lines.push('## Detailed Results');
  lines.push('');

  for (const comp of report.comparisons) {
    lines.push(`### ${comp.category}`);
    lines.push('');
    lines.push('**UASP:**');
    lines.push(`- Mean: ${formatMs(comp.uasp.timing.mean)}`);
    lines.push(`- Median: ${formatMs(comp.uasp.timing.median)}`);
    lines.push(`- Min: ${formatMs(comp.uasp.timing.min)}`);
    lines.push(`- Max: ${formatMs(comp.uasp.timing.max)}`);
    lines.push(`- Std Dev: ${formatMs(comp.uasp.timing.stdDev)}`);
    if (comp.uasp.memory) {
      lines.push(`- Memory Delta: ${formatBytes(comp.uasp.memory.delta)}`);
    }
    lines.push('');
    lines.push('**SKILL.md:**');
    lines.push(`- Mean: ${formatMs(comp.skillMd.timing.mean)}`);
    lines.push(`- Median: ${formatMs(comp.skillMd.timing.median)}`);
    lines.push(`- Min: ${formatMs(comp.skillMd.timing.min)}`);
    lines.push(`- Max: ${formatMs(comp.skillMd.timing.max)}`);
    lines.push(`- Std Dev: ${formatMs(comp.skillMd.timing.stdDev)}`);
    if (comp.skillMd.memory) {
      lines.push(`- Memory Delta: ${formatBytes(comp.skillMd.memory.delta)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Print report to console with colors
 */
export function printReport(report: BenchmarkReport): void {
  console.log(formatConsoleReport(report));
}
