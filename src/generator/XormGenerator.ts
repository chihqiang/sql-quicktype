import { DatabaseSchema, TableSchema, ColumnSchema, SQLType } from '../schema';
import { AGenerator, Options } from './base';

/**
 * XORM 语言生成器
 * 生成符合 XORM 规范的类型定义
 */
export class XormGenerator extends AGenerator {
  private options: Options;

  constructor(options: Options = { language: 'xorm' }) {
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
    const tag = this.generateXormTag(column);

    let result = `\t${fieldName} ${typeName} ${tag}`;
    if (column.comment && this.options.generateComments !== false) {
      result += ` // ${column.comment}`;
    }
    result += '\n';

    return result;
  }

  /**
   * 映射 SQL 类型到 XORM 类型
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
   * 生成 XORM 结构体标签
   */
  private generateXormTag(column: ColumnSchema): string {
    const tags = [];

    // 添加 column 标签
    tags.push(`${column.name}`);

    // 添加 type 标签
    let typeTag = '';
    switch (column.type.kind) {
      case 'int':
        typeTag = 'int';
        if (column.type.length) {
          typeTag += `(${column.type.length})`;
        }
        break;
      case 'bigint':
        typeTag = 'bigint';
        if (column.type.length) {
          typeTag += `(${column.type.length})`;
        }
        break;
      case 'float':
        typeTag = 'float';
        if (column.type.precision) {
          typeTag += `(${column.type.precision}`;
          if (column.type.scale) {
            typeTag += `,${column.type.scale}`;
          }
          typeTag += ')';
        }
        break;
      case 'decimal':
        typeTag = 'decimal';
        if (column.type.precision) {
          typeTag += `(${column.type.precision}`;
          if (column.type.scale) {
            typeTag += `,${column.type.scale}`;
          }
          typeTag += ')';
        }
        break;
      case 'varchar':
        typeTag = 'varchar';
        if (column.type.length) {
          typeTag += `(${column.type.length})`;
        }
        break;
      case 'text':
        typeTag = 'text';
        break;
      case 'boolean':
        typeTag = 'bool';
        break;
      case 'date':
        typeTag = 'date';
        break;
      case 'datetime':
        typeTag = 'datetime';
        break;
      case 'json':
        typeTag = 'json';
        break;
      case 'enum':
        typeTag = 'enum';
        break;
      default:
        typeTag = 'string';
    }
    if (typeTag) {
      tags.push(typeTag);
    }

    // 添加 primaryKey 标签
    if (column.primaryKey) {
      tags.push('pk');
    }

    // 添加 unique 标签
    if (column.unique) {
      tags.push('unique');
    }

    // 添加 not null 标签
    if (!column.nullable) {
      tags.push('notnull');
    }

    // 添加 default 标签
    if (column.default) {
      tags.push(`default(${column.default})`);
    }

    // 添加 autoIncrement 标签
    if (column.generated) {
      tags.push('autoincr');
    }

    // 添加 comment 标签
    if (column.comment) {
      tags.push(`comment(${column.comment})`);
    }

    return `\`xorm:"${tags.join(' ')}" json:"${column.name}"\``;
  }
}
