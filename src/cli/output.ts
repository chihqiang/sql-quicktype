import { Command } from 'commander';
import { parseSQL } from '../sql-parser';
import { GeneratorFactory } from '../generator';
import type { Options } from '../generator';
import * as fs from 'fs';
import * as path from 'path';
import {
  LANGUAGES,
  MODES,
  Language,
  Mode,
  LANGUAGE_EXTENSIONS,
  LANGUAGES_REQUIRING_NAMESPACE,
  DEFAULT_NAMESPACE,
} from '../constants';

export type { Language, Mode };

export interface GenerateOptions {
  output: string;
  language: Language;
  mode: Mode;
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

export async function generateCodeToFiles(
  sql: string,
  options: GenerateOptions
) {
  if (!LANGUAGES.includes(options.language)) {
    throw new Error(
      `Invalid language: ${options.language}. Valid options: ${LANGUAGES.join(', ')}`
    );
  }

  if (!MODES.includes(options.mode)) {
    throw new Error(
      `Invalid mode: ${options.mode}. Valid options: ${MODES.join(', ')}`
    );
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
    language: options.language,
    namespace: options.namespace,
    generateComments: true,
  };

  const generator = GeneratorFactory.createGenerator(
    options.language,
    generatorOptions
  );

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
