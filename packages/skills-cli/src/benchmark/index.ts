#!/usr/bin/env node
/**
 * Benchmark CLI - UASP vs SKILL.md format performance comparison
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import chalk from 'chalk';

import { runParsingBenchmarks } from './parsers.js';
import { runValidationBenchmarks } from './validators.js';
import { runConversionBenchmarks, calculateFileSizes, calculateFeatureCoverage } from './converters.js';
import { runSearchBenchmarks, searchUaspStructured, searchSkillMdFullText } from './search.js';
import {
  type BenchmarkOptions,
  type BenchmarkResult,
  runGC,
  formatMs,
  formatBytes,
} from './metrics.js';
import {
  createComparison,
  createReport,
  formatConsoleReport,
  formatJsonReport,
  formatMarkdownReport,
  type BenchmarkComparison,
} from './report.js';
import { convertToSkillMd } from '../core/installer.js';
import type { Skill, RegistrySkill } from '../types/index.js';

const program = new Command();

interface BenchmarkCliOptions {
  dir: string;
  output: 'console' | 'json' | 'markdown';
  save?: string;
  iterations: number;
  warmup: number;
  verbose: boolean;
}

/**
 * Load all skills from a directory
 */
async function loadSkills(dir: string): Promise<Array<{
  skill: Skill;
  registrySkill: RegistrySkill;
  content: string;
  path: string;
}>> {
  const skills: Array<{
    skill: Skill;
    registrySkill: RegistrySkill;
    content: string;
    path: string;
  }> = [];

  // Check if directory has registry.json
  const registryPath = path.join(dir, 'registry.json');
  if (await fs.pathExists(registryPath)) {
    const registryContent = await fs.readFile(registryPath, 'utf-8');
    const registry = JSON.parse(registryContent);

    for (const registrySkill of registry.skills) {
      const skillPath = path.join(dir, registrySkill.path);
      if (await fs.pathExists(skillPath)) {
        const content = await fs.readFile(skillPath, 'utf-8');
        const skill = yaml.parse(content) as Skill;
        skills.push({ skill, registrySkill, content, path: skillPath });
      }
    }
  } else {
    // Find .uasp.yaml files recursively
    const findSkillFiles = async (currentDir: string): Promise<string[]> => {
      const files: string[] = [];
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          files.push(...await findSkillFiles(fullPath));
        } else if (entry.name.endsWith('.uasp.yaml')) {
          files.push(fullPath);
        }
      }

      return files;
    };

    const skillFiles = await findSkillFiles(dir);

    for (const skillPath of skillFiles) {
      const content = await fs.readFile(skillPath, 'utf-8');
      const skill = yaml.parse(content) as Skill;

      const registrySkill: RegistrySkill = {
        name: skill.meta.name,
        version: skill.meta.version,
        type: skill.meta.type,
        description: skill.meta.description,
        path: path.relative(dir, skillPath),
        keywords: skill.triggers?.keywords || [],
      };

      skills.push({ skill, registrySkill, content, path: skillPath });
    }
  }

  return skills;
}

/**
 * Run all benchmarks
 */
async function runBenchmarks(options: BenchmarkCliOptions): Promise<void> {
  const { dir, output, save, iterations, warmup, verbose } = options;

  console.log(chalk.blue('\n🔬 UASP vs SKILL.md Benchmark Suite\n'));
  console.log(chalk.gray(`Directory: ${dir}`));
  console.log(chalk.gray(`Iterations: ${iterations}, Warmup: ${warmup}`));
  console.log('');

  // Load skills
  console.log(chalk.yellow('Loading skills...'));
  const skills = await loadSkills(dir);

  if (skills.length === 0) {
    console.log(chalk.red('No skills found in directory'));
    process.exit(1);
  }

  console.log(chalk.green(`Loaded ${skills.length} skill(s)\n`));

  const benchmarkOpts: BenchmarkOptions = {
    iterations,
    warmup,
    gcBetweenRuns: true,
    measureMemory: true,
  };

  const comparisons: BenchmarkComparison[] = [];

  // Prepare SKILL.md versions
  const skillMdContents: Array<{ name: string; content: string }> = [];
  for (const { skill, registrySkill } of skills) {
    const skillMdContent = convertToSkillMd(skill, registrySkill);
    skillMdContents.push({ name: skill.meta.name, content: skillMdContent });
  }

  // Use the largest skill for benchmarks
  const largestSkill = skills.reduce((a, b) =>
    a.content.length > b.content.length ? a : b
  );

  const largestSkillMd = skillMdContents.find(s => s.name === largestSkill.skill.meta.name)!;

  // 1. Parsing Benchmarks
  console.log(chalk.yellow('Running parsing benchmarks...'));
  if (verbose) {
    console.log(chalk.gray(`  Using skill: ${largestSkill.skill.meta.name} (${formatBytes(Buffer.byteLength(largestSkill.content))})`));
  }

  const parsingResults = await runParsingBenchmarks(
    largestSkill.content,
    largestSkillMd.content,
    benchmarkOpts
  );

  comparisons.push(createComparison('Parsing', parsingResults.uasp, parsingResults.skillMd));
  console.log(chalk.green('  ✓ Parsing benchmarks complete'));

  // 2. Validation Benchmarks
  console.log(chalk.yellow('Running validation benchmarks...'));
  runGC();

  const validationResults = await runValidationBenchmarks(
    largestSkill.skill,
    yaml.parse(largestSkillMd.content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '{}'),
    benchmarkOpts
  );

  comparisons.push(createComparison('Validation', validationResults.uasp, validationResults.skillMd));
  console.log(chalk.green('  ✓ Validation benchmarks complete'));

  // 3. Conversion Benchmarks
  console.log(chalk.yellow('Running conversion benchmarks...'));
  runGC();

  const conversionResults = await runConversionBenchmarks(
    largestSkill.skill,
    largestSkill.registrySkill,
    largestSkill.content,
    benchmarkOpts
  );

  // For conversion, we compare UASP conversion time vs "already converted" (near-zero)
  const noOpResult: BenchmarkResult = {
    name: 'SKILL.md (no conversion)',
    timing: { mean: 0.001, median: 0.001, min: 0.001, max: 0.001, stdDev: 0, samples: [] },
    iterations,
    warmup,
  };

  comparisons.push(createComparison('Conversion', conversionResults.conversion, noOpResult));
  console.log(chalk.green('  ✓ Conversion benchmarks complete'));

  // 4. Search Benchmarks
  console.log(chalk.yellow('Running search benchmarks...'));
  runGC();

  const searchQuery = 'browser'; // Common search term

  const searchResults = await runSearchBenchmarks(
    skills.map(s => ({ skill: s.skill, registrySkill: s.registrySkill })),
    skillMdContents,
    searchQuery,
    benchmarkOpts
  );

  comparisons.push(createComparison('Search', searchResults.uasp, searchResults.skillMd));
  console.log(chalk.green('  ✓ Search benchmarks complete'));

  // Generate report
  console.log('');
  const report = createReport(comparisons);

  // Add additional metrics
  if (verbose) {
    console.log(chalk.cyan('\nAdditional Metrics:'));
    console.log(chalk.gray(`  File Size Ratio: ${conversionResults.fileSize.ratio.toFixed(2)}x`));
    console.log(chalk.gray(`    UASP: ${conversionResults.fileSize.uaspFormatted}`));
    console.log(chalk.gray(`    SKILL.md: ${conversionResults.fileSize.skillMdFormatted}`));
    console.log(chalk.gray(`  Feature Coverage: ${conversionResults.featureCoverage.toFixed(1)}%`));
  }

  // Output report
  let reportOutput: string;
  switch (output) {
    case 'json':
      reportOutput = formatJsonReport(report);
      break;
    case 'markdown':
      reportOutput = formatMarkdownReport(report);
      break;
    default:
      reportOutput = formatConsoleReport(report);
  }

  console.log(reportOutput);

  // Save to file if requested
  if (save) {
    await fs.writeFile(save, reportOutput);
    console.log(chalk.green(`\nReport saved to: ${save}`));
  }
}

// CLI setup
program
  .name('uasp-benchmark')
  .description('Benchmark UASP vs SKILL.md format performance')
  .version('1.0.0');

program
  .option('-d, --dir <path>', 'Directory containing skills', process.cwd())
  .option('-o, --output <format>', 'Output format (console, json, markdown)', 'console')
  .option('-s, --save <path>', 'Save report to file')
  .option('-i, --iterations <n>', 'Number of iterations', '100')
  .option('-w, --warmup <n>', 'Number of warmup runs', '5')
  .option('-v, --verbose', 'Show verbose output', false)
  .action(async (opts) => {
    try {
      await runBenchmarks({
        dir: opts.dir,
        output: opts.output as 'console' | 'json' | 'markdown',
        save: opts.save,
        iterations: parseInt(opts.iterations, 10),
        warmup: parseInt(opts.warmup, 10),
        verbose: opts.verbose,
      });
    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

program.parse();
