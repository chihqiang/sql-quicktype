/**
 * generate-string.ts
 *
 * This file contains the command for generating code from SQL strings.
 * It defines the 'generate-string' CLI command that reads SQL from a string
 * and generates code in the specified language.
 */

import { Command } from 'commander';
import { generateCodeToFiles, addCommonGenerateOptions } from './output';

export function commandGenerateSqlString(program: Command) {
  const command = program
    .command('sql')
    .description('Generate code from SQL string')
    .requiredOption('-s, --sql <sql>', 'SQL string is required')
    .option(
      '-m, --mode <mode>',
      'Output mode: single (one file) or multi (one file per table)',
      'single'
    );

  addCommonGenerateOptions(command);

  command.action(async (options) => {
    try {
      console.log('Using provided SQL string');
      await generateCodeToFiles(options.sql, {
        output: options.output,
        language: options.language,
        mode: options.mode,
        namespace: options.namespace,
        dialect: options.dialect,
        dbName: options.dbName,
      });
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });
}
