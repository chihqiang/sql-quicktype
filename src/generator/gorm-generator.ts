import { DatabaseSchema, TableSchema, ColumnSchema, SQLType } from '../schema';
import { BaseGenerator, Options } from './base';

/**
 * GORM language generator
 * Generates type definitions conforming to GORM conventions
 */
export class GormGenerator extends BaseGenerator {
  private options: Options;

  constructor(options: Options = { language: 'gorm' }) {
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
    const tag = this.generateGormTag(column);

    let result = `\t${fieldName} ${typeName} ${tag}`;
    if (column.comment && this.options.generateComments !== false) {
      result += ` // ${column.comment}`;
    }
    result += '\n';

    return result;
  }

  /**
   * Map SQL type to GORM type
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
   * Generate GORM struct tags
   */
  private generateGormTag(column: ColumnSchema): string {
    const tags = [];

    // add column tag
    tags.push(`column:${column.name}`);

    // add type tag
    let typeTag = 'type:';
    switch (column.type.kind) {
      case 'int':
        typeTag += 'int';
        if (column.type.length) {
          typeTag += `(${column.type.length})`;
        }
        break;
      case 'bigint':
        typeTag += 'bigint';
        if (column.type.length) {
          typeTag += `(${column.type.length})`;
        }
        break;
      case 'float':
        typeTag += 'float';
        if (column.type.precision) {
          typeTag += `(${column.type.precision}`;
          if (column.type.scale) {
            typeTag += `,${column.type.scale}`;
          }
          typeTag += ')';
        }
        break;
      case 'decimal':
        typeTag += 'decimal';
        if (column.type.precision) {
          typeTag += `(${column.type.precision}`;
          if (column.type.scale) {
            typeTag += `,${column.type.scale}`;
          }
          typeTag += ')';
        }
        break;
      case 'varchar':
        typeTag += 'varchar';
        if (column.type.length) {
          typeTag += `(${column.type.length})`;
        }
        break;
      case 'text':
        typeTag += 'text';
        break;
      case 'boolean':
        typeTag += 'bool';
        break;
      case 'date':
        typeTag += 'date';
        break;
      case 'datetime':
        typeTag += 'datetime';
        break;
      case 'json':
        typeTag += 'json';
        break;
      case 'enum':
        typeTag += 'enum';
        break;
      default:
        typeTag += 'string';
    }
    tags.push(typeTag);

    // add primaryKey tag
    if (column.primaryKey) {
      tags.push('primaryKey');
    }

    // add unique tag
    if (column.unique) {
      tags.push('unique');
    }

    // add not null tag
    if (!column.nullable) {
      tags.push('not null');
    }

    // add default tag
    if (column.default) {
      tags.push(`default:${column.default}`);
    }

    // add autoIncrement tag
    if (column.generated) {
      tags.push('autoIncrement');
    }

    // add comment tag
    if (column.comment) {
      tags.push(`comment:${column.comment}`);
    }

    return `\`gorm:"${tags.join(';')}" json:"${column.name}"\``;
  }
}
