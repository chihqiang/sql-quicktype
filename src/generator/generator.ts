import { ColumnSchema, DatabaseSchema, SQLType, TableSchema } from '../schema';

/**
 * 生成器配置
 */
export interface Options {
  /**
   * 目标语言
   */
  language: 'go' | 'typescript' | 'gorm' | 'xorm';

  /**
   * 是否生成注释（默认 true）
   */
  generateComments?: boolean;

  /**
   * 命名空间/包名（适用于 Go、GORM、XORM 等需要包名的语言）
   */
  namespace?: string;
}

/**
 * 语言生成器基类
 * 定义了生成不同语言类型的通用接口和方法
 */
export abstract class AGenerator {
  /**
   * 生成整个数据库模式的类型定义
   */
  abstract generateDatabase(database: DatabaseSchema): string;

  /**
   * 生成单个表的类型定义
   */
  abstract generateTable(table: TableSchema): string;

  /**
   * 生成列的类型定义
   */
  abstract generateColumn(column: ColumnSchema): string;

  /**
   * 映射 SQL 类型到目标语言类型
   */
  abstract mapSQLType(type: SQLType): string;

  /**
   * 格式化类型名称（如驼峰命名、帕斯卡命名等）
   */
  protected formatTypeName(name: string): string {
    return name
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
  }

  /**
   * 格式化字段名称
   */
  protected formatFieldName(name: string): string {
    return name
      .split('_')
      .map((part) => {
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join('');
  }

  /**
   * 生成默认值
   */
  protected generateDefaultValue(column: ColumnSchema): string {
    if (!column.default) {
      return '';
    }
    return column.default;
  }

  /**
   * 检查是否需要导入 time 包
   */
  protected needsTimeImport(database: DatabaseSchema): boolean {
    for (const table of database.tables) {
      for (const column of table.columns) {
        if (column.type.kind === 'date' || column.type.kind === 'datetime') {
          return true;
        }
      }
    }
    return false;
  }
}

/**
 * 语言生成器工厂类
 * 用于创建不同语言的生成器实例
 */
export class GeneratorFactory {
  /**
   * 创建语言生成器实例
   * @param language 目标语言
   * @param options 生成器配置选项
   * @returns 语言生成器实例
   */
  static async createGenerator(
    language: 'go' | 'typescript' | 'gorm' | 'xorm',
    options: Options = { language }
  ) {
    switch (language) {
      case 'typescript':
        const { TypeScriptGenerator } = await import('./TypeScriptGenerator');
        return new TypeScriptGenerator(options);
      case 'go':
        const { GolangGenerator } = await import('./GolangGenerator');
        return new GolangGenerator(options);
      case 'gorm':
        const { GormGenerator } = await import('./GormGenerator');
        return new GormGenerator(options);
      case 'xorm':
        const { XormGenerator } = await import('./XormGenerator');
        return new XormGenerator(options);
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }
}
