/**
 * Benchmark metrics collection and timing utilities
 */

export interface TimingResult {
  /** Mean execution time in milliseconds */
  mean: number;
  /** Median execution time in milliseconds */
  median: number;
  /** Minimum execution time in milliseconds */
  min: number;
  /** Maximum execution time in milliseconds */
  max: number;
  /** Standard deviation in milliseconds */
  stdDev: number;
  /** All individual timings */
  samples: number[];
}

export interface MemoryResult {
  /** Memory used before operation (bytes) */
  before: number;
  /** Memory used after operation (bytes) */
  after: number;
  /** Memory difference (bytes) */
  delta: number;
  /** Heap used after operation (bytes) */
  heapUsed: number;
}

export interface BenchmarkResult {
  /** Name of the benchmark */
  name: string;
  /** Timing results */
  timing: TimingResult;
  /** Memory results (if measured) */
  memory?: MemoryResult;
  /** Number of iterations */
  iterations: number;
  /** Warmup runs */
  warmup: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Run garbage collection if available
 */
export function runGC(): void {
  if (global.gc) {
    global.gc();
  }
}

/**
 * Get current memory usage
 */
export function getMemoryUsage(): number {
  return process.memoryUsage().heapUsed;
}

/**
 * Calculate statistics from timing samples
 */
export function calculateStats(samples: number[]): TimingResult {
  if (samples.length === 0) {
    return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0, samples: [] };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const sum = samples.reduce((a, b) => a + b, 0);
  const mean = sum / samples.length;

  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;

  const squaredDiffs = samples.map(x => Math.pow(x - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / samples.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  return {
    mean,
    median,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stdDev,
    samples,
  };
}

/**
 * High-resolution timer
 */
export function hrtime(): bigint {
  return process.hrtime.bigint();
}

/**
 * Convert nanoseconds to milliseconds
 */
export function nsToMs(ns: bigint): number {
  return Number(ns) / 1_000_000;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format milliseconds to human readable string
 */
export function formatMs(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)} μs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)} ms`;
  }
  return `${(ms / 1000).toFixed(2)} s`;
}

export interface BenchmarkOptions {
  /** Number of iterations to run */
  iterations?: number;
  /** Number of warmup runs */
  warmup?: number;
  /** Run GC between iterations */
  gcBetweenRuns?: boolean;
  /** Measure memory usage */
  measureMemory?: boolean;
}

/**
 * Run a benchmark function multiple times and collect metrics
 */
export async function benchmark<T>(
  name: string,
  fn: () => T | Promise<T>,
  options: BenchmarkOptions = {}
): Promise<BenchmarkResult> {
  const {
    iterations = 100,
    warmup = 5,
    gcBetweenRuns = true,
    measureMemory = true,
  } = options;

  // Warmup runs
  for (let i = 0; i < warmup; i++) {
    await fn();
    if (gcBetweenRuns) runGC();
  }

  // Measure memory before
  let memoryBefore = 0;
  if (measureMemory) {
    runGC();
    memoryBefore = getMemoryUsage();
  }

  // Timed runs
  const timings: number[] = [];

  for (let i = 0; i < iterations; i++) {
    if (gcBetweenRuns) runGC();

    const start = hrtime();
    await fn();
    const end = hrtime();

    timings.push(nsToMs(end - start));
  }

  // Measure memory after
  let memoryResult: MemoryResult | undefined;
  if (measureMemory) {
    const memoryAfter = getMemoryUsage();
    memoryResult = {
      before: memoryBefore,
      after: memoryAfter,
      delta: memoryAfter - memoryBefore,
      heapUsed: process.memoryUsage().heapUsed,
    };
  }

  return {
    name,
    timing: calculateStats(timings),
    memory: memoryResult,
    iterations,
    warmup,
  };
}

/**
 * Compare two benchmark results
 */
export function compareBenchmarks(
  a: BenchmarkResult,
  b: BenchmarkResult
): { winner: string; ratio: number; difference: number } {
  const aTime = a.timing.mean;
  const bTime = b.timing.mean;

  if (aTime < bTime) {
    return {
      winner: a.name,
      ratio: bTime / aTime,
      difference: bTime - aTime,
    };
  } else {
    return {
      winner: b.name,
      ratio: aTime / bTime,
      difference: aTime - bTime,
    };
  }
}
