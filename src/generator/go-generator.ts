import { DatabaseSchema, TableSchema, ColumnSchema, SQLType } from '../schema';
import { BaseGenerator, Options } from './base';

/**
 * Go language generator
 * Generates type definitions conforming to Go conventions
 */
export class GoGenerator extends BaseGenerator {
  private options: Options;

  constructor(options: Options = { language: 'go' }) {
    super();
    this.options = options;
  }

  /**
   * Generate type definitions for the entire database schema
   */
  generateDatabase(database: DatabaseSchema): string {
    let result = `// Database: ${database.name}\n`;
    result += `// Dialect: ${database.dialect}\n\n`;

    // Add package statement if namespace is provided
    if (this.options.namespace) {
      result += `package ${this.options.namespace}\n\n`;
    }

    // Add imports if needed
    if (this.needsTimeImport(database)) {
      result += `import "time"\n\n`;
    }

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
    result += `type ${this.formatTypeName(table.name)} struct {\n`;

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
    const typeName = this.mapSQLType(column.type);
    const tag = this.generateGoTag(column);

    let result = `\t${fieldName} ${typeName} ${tag}`;
    if (column.comment && this.options.generateComments !== false) {
      result += ` // ${column.comment}`;
    }
    result += '\n';

    return result;
  }

  /**
   * Map SQL type to Go type
   */
  mapSQLType(type: SQLType): string {
    switch (type.kind) {
      case 'int':
        return 'int';
      case 'bigint':
        return 'int64';
      case 'float':
        return 'float64';
      case 'decimal':
        return 'float64';
      case 'varchar':
      case 'text':
        return 'string';
      case 'boolean':
        return 'bool';
      case 'date':
      case 'datetime':
        return 'time.Time';
      case 'json':
        return 'interface{}';
      case 'enum':
        return 'string';
      default:
        return 'string';
    }
  }

  /**
   * Generate Go struct tags
   */
  private generateGoTag(column: ColumnSchema): string {
    const tags = [];
    tags.push(`json:"${column.name}"`);
    tags.push(`db:"${column.name}"`);
    return `\`${tags.join(' ')}\``;
  }
}
