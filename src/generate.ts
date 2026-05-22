import { GeneratorFactory } from './generator';
import type { Options } from './generator';
import { parseSQL } from './sql-parser';

export function generateCode(
  sql: string,
  options: {
    language: 'go' | 'typescript' | 'gorm' | 'xorm';
    namespace?: string;
    dialect?: string;
    dbName?: string;
  }
) {
  const dbSchema = parseSQL(sql, {
    dialect: options.dialect || 'mysql',
    dbName: options.dbName || 'my_database',
  });

  const generatorOptions: Options = {
    language: options.language,
    namespace: options.namespace,
    generateComments: true,
  };

  const generator = GeneratorFactory.createGenerator(
    options.language,
    generatorOptions
  );

  return generator.generateDatabase(dbSchema);
}
