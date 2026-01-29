#!/usr/bin/env node

/**
 * UASP Skills CLI
 *
 * CLI tool for managing UASP agent skills
 */

import { Command } from 'commander';
import { addCommand } from './commands/add.js';
import { listCommand } from './commands/list.js';
import { removeCommand } from './commands/remove.js';
import { searchCommand } from './commands/search.js';
import { initCommand } from './commands/init.js';
import { benchmarkCommand } from './commands/benchmark.js';

const program = new Command();

program
  .name('skills')
  .description('CLI tool for managing UASP agent skills')
  .version('0.1.5');

// Add commands
program.addCommand(addCommand);
program.addCommand(listCommand);
program.addCommand(removeCommand);
program.addCommand(searchCommand);
program.addCommand(initCommand);
program.addCommand(benchmarkCommand);

// Parse and execute
program.parse(process.argv);
