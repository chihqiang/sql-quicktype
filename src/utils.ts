import { GeneratorFactory, Options } from './generator/generator';
import { parseSQL } from './sql-parser';

/**
 * generateCode
 *
 * Generates code from SQL schema for the specified language.
 * This function is designed to work in both Node.js and browser environments.
 *
 * @param sql - SQL schema string
 * @param options - Generation options
 * @returns Generated code string
 */
export async function generateCode(
  sql: string,
  options: {
    language: 'go' | 'typescript' | 'gorm' | 'xorm';
    namespace?: string;
    dialect?: string;
    dbName?: string;
  }
) {
  // Parse SQL schema
  const dbSchema = parseSQL(sql, {
    dialect: options.dialect || 'mysql',
    dbName: options.dbName || 'my_database',
  });

  // Create generator options
  const generatorOptions: Options = {
    language: options.language,
    namespace: options.namespace,
    generateComments: true,
  };

  // Create generator instance
  const generator = await GeneratorFactory.createGenerator(
    options.language,
    generatorOptions
  );

  // Generate code
  return generator.generateDatabase(dbSchema);
}
