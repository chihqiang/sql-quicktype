import { DatabaseSchema, TableSchema, ColumnSchema, SQLType } from '../schema';
import { AGenerator, Options } from './generator';

/**
 * Go 语言生成器
 * 生成符合 Go 语言规范的类型定义
 */
export class GolangGenerator extends AGenerator {
  private options: Options;

  constructor(options: Options = { language: 'go' }) {
    super();
    this.options = options;
  }

  /**
   * 生成整个数据库模式的类型定义
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
   * 生成单个表的类型定义
   */
  generateTable(table: TableSchema): string {
    let result = `// ${table.name} 表结构\n`;
    result += `type ${this.formatTypeName(table.name)} struct {\n`;

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
   * 映射 SQL 类型到 Go 类型
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
   * 生成 Go 结构体标签
   */
  private generateGoTag(column: ColumnSchema): string {
    const tags = [];
    tags.push(`json:"${column.name}"`);
    tags.push(`db:"${column.name}"`);
    return `\`${tags.join(' ')}\``;
  }
}
