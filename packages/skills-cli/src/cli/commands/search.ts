/**
 * Search command - Search for skills in a registry
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadRegistry, searchSkills } from '../../core/registry.js';

// Default registry URL
const DEFAULT_REGISTRY = 'https://github.com/ifoster01/uasp/agent-skills';

export const searchCommand = new Command('search')
  .description('Search for skills in a registry')
  .argument('<query>', 'Search query')
  .option('-r, --registry <url>', 'Registry URL', DEFAULT_REGISTRY)
  .option('-j, --json', 'Output as JSON')
  .action(async (query: string, options: { registry: string; json?: boolean }) => {
    const spinner = ora('Searching...').start();

    try {
      const registry = await loadRegistry(options.registry);
      const results = searchSkills(registry, query);

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      if (results.length === 0) {
        console.log(chalk.yellow(`No skills found matching '${query}'`));
        return;
      }

      console.log(chalk.bold(`\nFound ${results.length} skill(s):\n`));

      for (const skill of results) {
        const type = chalk.dim(`[${skill.type}]`);
        const keywords = skill.keywords.slice(0, 5).join(', ');

        console.log(`  ${chalk.cyan(skill.name)} ${type}`);
        console.log(`    ${skill.description}`);
        console.log(`    Keywords: ${chalk.dim(keywords)}`);
        console.log();
      }

      console.log(chalk.dim(`Install with: skills add ${options.registry} --skill <name>`));
    } catch (error) {
      spinner.fail('Search failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });
