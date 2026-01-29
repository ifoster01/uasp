/**
 * List command - Show installed skills
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { listInstalledSkills } from '../../core/installer.js';

export const listCommand = new Command('list')
  .description('List installed skills')
  .option('-j, --json', 'Output as JSON')
  .action(async (options: { json?: boolean }) => {
    try {
      const skills = await listInstalledSkills();

      if (options.json) {
        console.log(JSON.stringify(skills, null, 2));
        return;
      }

      if (skills.length === 0) {
        console.log(chalk.yellow('No skills installed'));
        console.log('\nRun `skills add <source> --skill <name>` to install a skill');
        return;
      }

      console.log(chalk.bold(`\nInstalled Skills (${skills.length}):\n`));

      for (const skill of skills) {
        const status = skill.enabled ? chalk.green('enabled') : chalk.gray('disabled');
        const type = chalk.dim(`[${skill.type}]`);

        console.log(`  ${chalk.cyan(skill.name)} ${type}`);
        console.log(`    Version: ${skill.version}`);
        console.log(`    Status: ${status}`);
        console.log(`    Path: ${chalk.dim(skill.path)}`);
        console.log(`    Source: ${chalk.dim(skill.source)}`);
        console.log();
      }
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });
