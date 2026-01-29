/**
 * Benchmark command - Run UASP vs SKILL.md performance benchmarks
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { runBenchmarks, type BenchmarkCliOptions } from '../../benchmark/index.js';

export const benchmarkCommand = new Command('benchmark')
  .description('Benchmark UASP vs SKILL.md format performance')
  .option('-d, --dir <path>', 'Directory containing skills', process.cwd())
  .option('-o, --output <format>', 'Output format (console, json, markdown)', 'console')
  .option('-s, --save <path>', 'Save report to file')
  .option('-i, --iterations <n>', 'Number of iterations', '100')
  .option('-w, --warmup <n>', 'Number of warmup runs', '5')
  .option('-v, --verbose', 'Show verbose output', false)
  .action(async (opts) => {
    try {
      const options: BenchmarkCliOptions = {
        dir: opts.dir,
        output: opts.output as 'console' | 'json' | 'markdown',
        save: opts.save,
        iterations: parseInt(opts.iterations, 10),
        warmup: parseInt(opts.warmup, 10),
        verbose: opts.verbose,
      };
      await runBenchmarks(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
