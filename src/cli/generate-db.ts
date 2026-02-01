/**
 * generate-from-db.ts
 *
 * This file contains the command for generating code from a database connection.
 * It defines the 'generate-from-db' CLI command that connects to a MySQL database
 * using individual connection parameters and generates code based on the database schema.
 */

import { Command } from 'commander';
import { generateCode, addCommonGenerateOptions } from './generate';
import mysql from 'mysql2/promise';
import { DEFAULT_NAMESPACE, LANGUAGES_REQUIRING_NAMESPACE } from './generate';

/**
 * commandGenerateDb
 *
 * Registers the 'generate-db' CLI command.
 *
 * @param program - Commander.js program instance
 */
export async function commandGenerateDb(program: Command) {
  const command = program
    .command('db')
    .description('Generate code from database connection')
    .option('-h, --host <host>', 'MySQL database host', '127.0.0.1')
    .option(
      '-P, --port <port>',
      'MySQL database port',
      (value) => parseInt(value),
      3306
    )
    .option('-u, --user <user>', 'MySQL database username', 'root')
    .option('-p, --password <password>', 'MySQL database password', '')
    .option('-d, --database <database>', 'MySQL database name', 'test');

  addCommonGenerateOptions(command);

  command.action(async (options) => {
    let connection: mysql.Connection | null = null;

    try {
      const connectionOptions = {
        host: options.host,
        port: options.port,
        user: options.user,
        password: options.password,
        database: options.database,
      };

      console.log(
        `Connecting to ${connectionOptions.host}:${connectionOptions.port}/${connectionOptions.database}`
      );
      connection = await mysql.createConnection(connectionOptions);
      console.log('Connected to database successfully');

      const [tablesResult] = await connection.execute('SHOW TABLES');
      const tables: string[] = (tablesResult as any[]).map(
        (row: any) => Object.values(row)[0] as string
      );
      console.log(`Found ${tables.length} tables: ${tables.join(', ')}`);

      const needsNamespace = LANGUAGES_REQUIRING_NAMESPACE.includes(
        options.language
      );
      if (needsNamespace && !options.namespace) {
        options.namespace = DEFAULT_NAMESPACE;
      }

      let successCount = 0;
      let failCount = 0;
      const failedTables: string[] = [];

      for (const tableName of tables) {
        console.log(`Processing table: ${tableName}`);

        try {
          const [result] = await connection!.execute(
            `SHOW CREATE TABLE \`${tableName}\``
          );
          const row = (result as any[])[0] as Record<string, any>;
          const createTableSql = row['Create Table'];

          await generateCode(createTableSql, {
            output: options.output,
            language: options.language,
            mode: 'multi',
            namespace: options.namespace,
            dialect: options.dialect,
            dbName: options.dbName || options.database,
          });
          successCount++;
        } catch (error) {
          console.error(
            `Failed to process table '${tableName}':`,
            (error as Error).message
          );
          failCount++;
          failedTables.push(tableName);
        }
      }

      console.log(
        `\nSummary: ${successCount} tables succeeded, ${failCount} tables failed`
      );
      if (failedTables.length > 0) {
        console.log(`Failed tables: ${failedTables.join(', ')}`);
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    } finally {
      if (connection) {
        try {
          await connection.end();
        } catch (error) {
          console.error('Error closing database connection:', error);
        }
      }
    }
  });
}
