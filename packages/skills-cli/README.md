# uasp-skills

CLI tool for managing UASP agent skills.

## Installation

```bash
# Use directly with npx
npx uasp-skills <command>

# Or install globally
npm install -g uasp-skills
```

## Commands

### Add a skill

Install a skill from a GitHub registry:

```bash
# Install a specific skill
npx uasp-skills add https://github.com/ifoster01/uasp/agent-skills --skill agent-browser

# Install all skills from a registry
npx uasp-skills add https://github.com/ifoster01/uasp/agent-skills --all
```

### List installed skills

```bash
npx uasp-skills list

# Output as JSON
npx uasp-skills list --json
```

### Remove a skill

```bash
npx uasp-skills remove agent-browser
```

### Search for skills

```bash
npx uasp-skills search browser

# Search a specific registry
npx uasp-skills search payment --registry https://github.com/other/skills
```

### Initialize .agent directory

```bash
npx uasp-skills init
```

## Directory Structure

After installing skills, your project will have:

```
.agent/
├── settings.json     # Configuration and installed skills
└── skills/
    └── skill-name/
        └── skill-name.uasp.yaml
```

## Settings Format

The `settings.json` file tracks installed skills:

```json
{
  "version": "1.0.0",
  "skills": {
    "installed": [
      {
        "name": "agent-browser",
        "version": "e3fbde81",
        "type": "cli",
        "path": ".agent/skills/agent-browser/agent-browser.uasp.yaml",
        "enabled": true,
        "installedAt": "2026-01-29T00:00:00Z",
        "source": "ifoster01/uasp/agent-skills"
      }
    ]
  },
  "triggers": {
    "keywords": {
      "browser": ["agent-browser"],
      "web": ["agent-browser"]
    }
  }
}
```

## Programmatic Usage

```typescript
import { loadRegistry, searchSkills, installSkill } from 'uasp-skills';

// Load a registry
const registry = await loadRegistry('https://github.com/ifoster01/uasp/agent-skills');

// Search for skills
const results = searchSkills(registry, 'browser');

// Install a skill programmatically
const result = await installSkill(githubSource, skill);
```

## Benchmarking

The CLI includes a comprehensive benchmarking suite that compares the performance of UASP (`.uasp.yaml`) format against SKILL.md format across multiple dimensions.

### Running Benchmarks

```bash
# Run benchmarks on skills in current directory
npx uasp-skills benchmark

# Run benchmarks on a specific skills directory
npx uasp-skills benchmark --dir ./path/to/skills

# Output as JSON
npx uasp-skills benchmark --output json

# Output as Markdown
npx uasp-skills benchmark --output markdown

# Save report to file
npx uasp-skills benchmark --save report.md --output markdown

# Customize iterations and warmup
npx uasp-skills benchmark --iterations 200 --warmup 10

# Show verbose output with additional metrics
npx uasp-skills benchmark --verbose
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-d, --dir <path>` | Directory containing skills to benchmark | Current directory |
| `-o, --output <format>` | Output format: `console`, `json`, or `markdown` | `console` |
| `-s, --save <path>` | Save the report to a file | - |
| `-i, --iterations <n>` | Number of benchmark iterations | `100` |
| `-w, --warmup <n>` | Number of warmup runs before benchmarking | `5` |
| `-v, --verbose` | Show additional metrics (file sizes, feature coverage) | `false` |

### Benchmark Categories

The benchmark suite measures performance across four key categories:

#### 1. Parsing Benchmarks

Compares the time to parse skill definitions:
- **UASP**: Full YAML parsing using the `yaml` library
- **SKILL.md**: Frontmatter extraction and parsing using `gray-matter`

```typescript
// UASP parsing
const skill = yaml.parse(uaspContent);

// SKILL.md parsing
const { data, content } = matter(skillMdContent);
```

#### 2. Validation Benchmarks

Compares schema validation approaches:
- **UASP**: Strict AJV JSON Schema validation with comprehensive type checking
- **SKILL.md**: Loose runtime validation checking only required fields

The UASP validation ensures type safety and catches configuration errors early, while SKILL.md relies on minimal validation.

#### 3. Conversion Benchmarks

Measures the time to convert UASP format to SKILL.md format. Also calculates:
- **File Size Ratio**: Compares the byte size of both formats
- **Feature Coverage**: Percentage of UASP features preserved in SKILL.md conversion

Features tracked for coverage:
- Meta information (name, version, type, description)
- Triggers (keywords, intents, file patterns)
- Constraints (never, always, prefer rules)
- Decisions, Commands, Workflows
- State entities, Templates, Environment variables
- Reference sections, Sources

#### 4. Search Benchmarks

Compares search performance:
- **UASP Structured Search**: Searches specific fields (name, description, keywords, intents) with weighted scoring
- **SKILL.md Full-text Search**: Searches entire document content with occurrence counting

Structured search provides better relevance ranking while full-text search is simpler but may return less relevant results.

### Metrics Collected

For each benchmark, the following metrics are collected:

| Metric | Description |
|--------|-------------|
| Mean | Average execution time |
| Median | Middle value of all samples |
| Min | Fastest execution time |
| Max | Slowest execution time |
| Std Dev | Standard deviation (consistency measure) |
| Memory Delta | Heap memory change (when `--verbose`) |

### Report Output

#### Console Output

```
═══════════════════════════════════════════════════════════════════════════════
  UASP vs SKILL.md Format Benchmark
  Generated: 2026-01-29T12:00:00.000Z
═══════════════════════════════════════════════════════════════════════════════

┌────────────────────┬───────────────┬───────────────┬──────────┬─────────┐
│ Category           │ UASP          │ SKILL.md      │ Winner   │ Speedup │
├────────────────────┼───────────────┼───────────────┼──────────┼─────────┤
│ Parsing            │     0.15 ms   │     0.22 ms   │ UASP     │  1.47x  │
│ Validation         │     0.08 ms   │     0.02 ms   │ SKILL-MD │  4.00x  │
│ Conversion         │     0.12 ms   │     0.00 ms   │ SKILL-MD │ 12.00x  │
│ Search             │     0.05 ms   │     0.18 ms   │ UASP     │  3.60x  │
└────────────────────┴───────────────┴───────────────┴──────────┴─────────┘

Summary:
  UASP wins:     2
  SKILL.md wins: 2
  Ties:          0
```

#### JSON Output

The JSON output includes full benchmark data for programmatic analysis:

```json
{
  "title": "UASP vs SKILL.md Format Benchmark",
  "timestamp": "2026-01-29T12:00:00.000Z",
  "comparisons": [
    {
      "category": "Parsing",
      "uasp": {
        "name": "UASP YAML",
        "timing": { "mean": 0.15, "median": 0.14, "min": 0.12, "max": 0.25, "stdDev": 0.02 },
        "iterations": 100,
        "warmup": 5
      },
      "skillMd": { ... },
      "winner": "uasp",
      "speedup": 1.47
    }
  ],
  "summary": { "uaspWins": 2, "skillMdWins": 2, "ties": 0 }
}
```

#### Markdown Output

The Markdown output includes a summary table plus detailed results for each category, suitable for documentation or reports.

### How It Works

1. **Skill Loading**: The benchmark loads all `.uasp.yaml` files from the specified directory. If a `registry.json` exists, it uses that to locate skills.

2. **Skill Conversion**: Each UASP skill is converted to SKILL.md format for comparison.

3. **Warmup Phase**: Before each benchmark category, warmup iterations run to eliminate JIT compilation effects.

4. **Timed Runs**: Each operation runs for the specified number of iterations using high-resolution timing (`process.hrtime.bigint()`).

5. **GC Management**: Garbage collection is triggered between runs (when available) to reduce noise in measurements.

6. **Statistics**: Results are aggregated into statistical summaries (mean, median, stdDev, etc.).

7. **Comparison**: Results are compared to determine the winner in each category, with a 5% tolerance for ties.

### Programmatic Usage

```typescript
import {
  benchmark,
  runParsingBenchmarks,
  runValidationBenchmarks,
  runSearchBenchmarks,
  createReport,
  formatMarkdownReport
} from 'uasp-skills/benchmark';

// Run a custom benchmark
const result = await benchmark('My Operation', () => {
  // Your code here
}, { iterations: 100, warmup: 5 });

console.log(`Mean: ${result.timing.mean}ms`);
console.log(`Std Dev: ${result.timing.stdDev}ms`);
```

## License

MIT
