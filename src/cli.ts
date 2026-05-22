/**
 * sql-quicktype CLI main entry file
 * Registers all commands and starts the CLI program
 */
import { Command } from 'commander';
const program = new Command();
import { sqlCommand } from './cli/sql-command';
import { dbCommand } from './cli/db-command';
import { version } from '../package.json';

program
  .name('sql-quicktype')
  .description('Generate code from SQL schema definitions')
  .version(version);

// Register generate-string command
sqlCommand(program);
// Register generate-db command
dbCommand(program);

// Parse command line arguments
program.parse();
