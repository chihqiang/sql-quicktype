import { ColumnSchema, DatabaseSchema, SQLType, TableSchema } from '../schema';
import { BaseGenerator, Options } from './base';

/**
 * TypeScript language generator
 * Generates type definitions conforming to TypeScript conventions
 */
export class TypeScriptGenerator extends BaseGenerator {
  private options: Options;
  constructor(options: Options = { language: 'typescript' }) {
    super();
    this.options = options;
  }

  /**
   * Format field name (camelCase)
   */
  protected formatFieldName(name: string): string {
    return name
      .split('_')
      .map((part, index) => {
        if (index === 0) {
          return part.toLowerCase();
        }
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join('');
  }

  /**
   * Generate type definitions for the entire database schema
   */
  generateDatabase(database: DatabaseSchema): string {
    let result = `// Database: ${database.name}\n`;
    result += `// Dialect: ${database.dialect}\n\n`;

    for (const table of database.tables) {
      result += this.generateTable(table);
      result += '\n';
    }

    return result;
  }

  /**
   * Generate type definition for a single table
   */
  generateTable(table: TableSchema): string {
    let result = `// ${table.name} table structure\n`;
    result += `export interface ${this.formatTypeName(table.name)} {\n`;

    for (const column of table.columns) {
      result += this.generateColumn(column);
    }

    result += '}\n';
    return result;
  }

  /**
   * Generate column type definition
   */
  generateColumn(column: ColumnSchema): string {
    const fieldName = this.formatFieldName(column.name);
    const typeName = this.mapSQLType(column.type, column.name);
    const optional = column.nullable ? '?' : '';

    let result = `\t${fieldName}${optional}: ${typeName}`;
    if (column.comment && this.options.generateComments !== false) {
      result += `; // ${column.comment}`;
    }
    result += '\n';

    return result;
  }

  /**
   * Map SQL type to TypeScript type
   */
  mapSQLType(type: SQLType, columnName?: string): string {
    switch (type.kind) {
      case 'int':
      case 'bigint':
        return 'number';
      case 'float':
      case 'decimal':
        return 'number';
      case 'varchar':
      case 'text':
        return 'string';
      case 'boolean':
        return 'boolean';
      case 'date':
      case 'datetime':
        return 'Date';
      case 'json':
        return 'unknown';
      case 'enum':
        if (type.values && type.values.length > 0) {
          const enumValues = type.values.map((v) => `'${v}'`).join(' | ');
          if (columnName) {
            const fieldName = this.formatFieldName(columnName);
            return `${fieldName}: ${enumValues}`;
          }
          return enumValues;
        }
        return 'string';
      default:
        return 'string';
    }
  }
}
