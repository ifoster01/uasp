/**
 * Remove command - Uninstall a skill
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { removeSkill, listInstalledSkills } from '../../core/installer.js';

interface RemoveOptions {
  claudeCode?: boolean;
}

export const removeCommand = new Command('remove')
  .description('Remove an installed skill')
  .argument('<name>', 'Name of the skill to remove')
  .option('--no-claude-code', 'Skip removal from Claude Code directories')
  .action(async (name: string, options: RemoveOptions) => {
    const spinner = ora(`Removing ${name}...`).start();
    const enableClaudeCode = options.claudeCode !== false;

    try {
      // Check if skill exists
      const installed = await listInstalledSkills();
      const skill = installed.find((s) => s.name === name);

      if (!skill) {
        spinner.fail(`Skill '${name}' is not installed`);
        console.log('\nInstalled skills:');
        installed.forEach((s) => {
          console.log(`  - ${chalk.cyan(s.name)}`);
        });
        process.exit(1);
      }

      // Remove the skill
      const success = await removeSkill(name, { claudeCode: enableClaudeCode });

      if (success) {
        const claudeStatus = enableClaudeCode ? ' (+ Claude Code)' : '';
        spinner.succeed(`Removed ${chalk.cyan(name)}${claudeStatus}`);
      } else {
        spinner.fail(`Failed to remove ${name}`);
        process.exit(1);
      }
    } catch (error) {
      spinner.fail('Removal failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });
