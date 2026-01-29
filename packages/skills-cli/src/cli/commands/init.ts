/**
 * Init command - Initialize .agent directory
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { initAgentDir, getAgentDir } from '../../core/installer.js';

export const initCommand = new Command('init')
  .description('Initialize .agent directory structure')
  .action(async () => {
    const spinner = ora('Initializing...').start();

    try {
      await initAgentDir();

      spinner.succeed('Initialized .agent directory');

      console.log(`\nCreated:`);
      console.log(`  ${chalk.dim(getAgentDir())}/`);
      console.log(`    ${chalk.dim('settings.json')}`);
      console.log(`    ${chalk.dim('skills/')}`);

      console.log(`\n${chalk.green('Ready to install skills!')}`);
      console.log(
        chalk.dim('Run `skills add <registry-url> --skill <name>` to install a skill')
      );
    } catch (error) {
      spinner.fail('Initialization failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });
