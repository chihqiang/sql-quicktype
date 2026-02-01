/**
 * generate.ts
 *
 * This file contains common functionality for code generation commands.
 * It provides:
 * 1. GenerateOptions interface - Common options for code generation
 * 2. addCommonGenerateOptions function - Adds common CLI options to commands
 * 3. generateCode function - Core code generation logic
 */

import { Command } from 'commander';
import { parseSQL } from '../sql-parser';
import { GeneratorFactory, Options } from '../generator/generator';
import * as fs from 'fs';
import * as path from 'path';

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  typescript: '.ts',
  go: '.go',
  gorm: '.go',
  xorm: '.go',
};

const VALID_LANGUAGES = ['go', 'typescript', 'gorm', 'xorm'];
const VALID_MODES = ['single', 'multi'];
export const DEFAULT_NAMESPACE = 'models';
export const LANGUAGES_REQUIRING_NAMESPACE = ['go', 'gorm', 'xorm'];

/**
 * GenerateOptions
 *
 * Common options for code generation commands.
 */
export interface GenerateOptions {
  output: string;
  language: string;
  mode: string;
  namespace?: string;
  dialect: string;
  dbName: string;
}

export function addCommonGenerateOptions(command: Command) {
  return command
    .option('-o, --output <dir>', 'Output directory', './output')
    .option(
      '-l, --language <lang>',
      'Target language (gorm, typescript, xorm)',
      'typescript'
    )
    .option(
      '-n, --namespace <namespace>',
      `Namespace/package name (default: ${DEFAULT_NAMESPACE} for go/gorm/xorm)`
    )
    .option(
      '-x, --dialect <dialect>',
      'SQL dialect (mysql, postgres, sqlite, sqlserver)',
      'mysql'
    )
    .option('--db-name <name>', 'Database name', 'my_database');
}

export async function generateCode(sql: string, options: GenerateOptions) {
  if (!VALID_LANGUAGES.includes(options.language)) {
    console.error(
      `Error: Invalid language: ${options.language}. Valid options: ${VALID_LANGUAGES.join(', ')}`
    );
    process.exit(1);
  }

  if (!VALID_MODES.includes(options.mode)) {
    console.error(
      `Error: Invalid mode: ${options.mode}. Valid options: ${VALID_MODES.join(', ')}`
    );
    process.exit(1);
  }

  const needsNamespace = LANGUAGES_REQUIRING_NAMESPACE.includes(
    options.language
  );
  if (needsNamespace && !options.namespace) {
    options.namespace = DEFAULT_NAMESPACE;
  }

  const dbSchema = parseSQL(sql, {
    dialect: options.dialect,
    dbName: options.dbName,
  });
  console.log(`Parsed ${dbSchema.tables.length} table(s)`);

  const generatorOptions: Options = {
    language: options.language as 'go' | 'typescript' | 'gorm' | 'xorm',
    namespace: options.namespace,
    generateComments: true,
  };

  let generator;
  try {
    generator = await GeneratorFactory.createGenerator(
      options.language as 'go' | 'typescript' | 'gorm' | 'xorm',
      generatorOptions
    );
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }

  const outputDir = path.resolve(options.output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fileExtension = LANGUAGE_EXTENSIONS[options.language] || '.go';

  if (options.mode === 'single') {
    const content = generator.generateDatabase(dbSchema);
    const outputFile = path.join(outputDir, `models${fileExtension}`);
    fs.writeFileSync(outputFile, content, 'utf-8');
    console.log(`Generated: ${outputFile}`);
  } else {
    for (const table of dbSchema.tables) {
      const content = generator.generateTable(table);
      const fileName = `${table.name.toLowerCase()}${fileExtension}`;
      const outputFile = path.join(outputDir, fileName);

      let fileContent = '';
      if (generatorOptions.namespace && needsNamespace) {
        fileContent += `package ${generatorOptions.namespace}\n\n`;
      }
      fileContent += content;

      fs.writeFileSync(outputFile, fileContent, 'utf-8');
      console.log(`Generated: ${outputFile}`);
    }
  }

  console.log('Done!');
}
