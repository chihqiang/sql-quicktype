import { ColumnSchema, DatabaseSchema, SQLType, TableSchema } from '../schema';
import { AGenerator, Options } from './base';

/**
 * TypeScript 语言生成器
 * 生成符合 TypeScript 规范的类型定义
 */
export class TypeScriptGenerator extends AGenerator {
  private options: Options;
  constructor(options: Options = { language: 'typescript' }) {
    super();
    this.options = options;
  }

  /**
   * 格式化字段名称（使用驼峰命名）
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
   * 生成整个数据库模式的类型定义
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
   * 生成单个表的类型定义
   */
  generateTable(table: TableSchema): string {
    let result = `// ${table.name} 表结构\n`;
    result += `export interface ${this.formatTypeName(table.name)} {\n`;

    for (const column of table.columns) {
      result += this.generateColumn(column);
    }

    result += '}\n';
    return result;
  }

  /**
   * 生成列的类型定义
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
   * 映射 SQL 类型到 TypeScript 类型
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
