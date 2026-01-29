/**
 * Add command - Install a skill from a registry
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import os from 'os';
import { loadRegistry, findSkill, getGitHubSource } from '../../core/registry.js';
import { installSkill } from '../../core/installer.js';

interface AddOptions {
  skill?: string;
  all?: boolean;
  force?: boolean;
  claudeCode?: boolean;
}

export const addCommand = new Command('add')
  .description('Install a skill from a GitHub registry')
  .argument('<source>', 'GitHub URL or local path to the skills registry')
  .option('-s, --skill <name>', 'Specific skill to install')
  .option('-a, --all', 'Install all skills from the registry')
  .option('-f, --force', 'Overwrite existing installation')
  .option('--no-claude-code', 'Skip Claude Code installation (only install to .agent/)')
  .action(async (source: string, options: AddOptions) => {
    const spinner = ora('Loading registry...').start();
    const enableClaudeCode = options.claudeCode !== false;

    try {
      // Load the registry
      const registry = await loadRegistry(source);
      const githubSource = getGitHubSource(source);

      spinner.succeed(`Found ${registry.skills.length} skills in registry`);

      // Determine which skills to install
      let skillsToInstall = registry.skills;

      if (options.skill) {
        const skill = findSkill(registry, options.skill);
        if (!skill) {
          console.error(chalk.red(`Skill '${options.skill}' not found in registry`));
          console.log('\nAvailable skills:');
          registry.skills.forEach((s) => {
            console.log(`  - ${chalk.cyan(s.name)}: ${s.description}`);
          });
          process.exit(1);
        }
        skillsToInstall = [skill];
      } else if (!options.all) {
        console.log(chalk.yellow('\nNo skill specified. Use --skill <name> or --all'));
        console.log('\nAvailable skills:');
        registry.skills.forEach((s) => {
          console.log(`  - ${chalk.cyan(s.name)}: ${s.description}`);
        });
        process.exit(1);
      }

      // Track Claude Code installations
      let claudeCodeCount = 0;

      // Install each skill
      for (const skill of skillsToInstall) {
        const installSpinner = ora(`Installing ${skill.name}...`).start();

        const result = await installSkill(githubSource, skill, {
          claudeCode: enableClaudeCode,
        });

        if (result.success) {
          const claudeStatus = result.claudeCodeInstalled
            ? chalk.dim(' + Claude Code')
            : '';
          installSpinner.succeed(
            `Installed ${chalk.cyan(skill.name)} v${skill.version} (${skill.type})${claudeStatus}`
          );
          if (result.claudeCodeInstalled) {
            claudeCodeCount++;
          }
        } else {
          installSpinner.fail(`Failed to install ${skill.name}: ${result.error}`);
        }
      }

      console.log(chalk.green('\nInstallation complete!'));
      console.log(`\nLocations:`);
      console.log(`  ${chalk.dim('.agent/skills/')} - UASP format (project-local)`);

      if (claudeCodeCount > 0) {
        console.log(
          `  ${chalk.dim('~/.agents/skills/')} - SKILL.md format (Claude Code compatible)`
        );
        console.log(
          `\n${chalk.cyan('Claude Code:')} ${claudeCodeCount} skill(s) available immediately`
        );
      }
    } catch (error) {
      spinner.fail('Installation failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });
