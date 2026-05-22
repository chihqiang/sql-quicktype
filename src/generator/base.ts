import { ColumnSchema, DatabaseSchema, SQLType, TableSchema } from '../schema';
import type { Language } from '../constants';

/**
 * 生成器配置
 */
export interface Options {
  /**
   * 目标语言
   */
  language: Language;

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
  protected formatFieldNamePascalCase(name: string): string {
    return name
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
  }

  protected formatFieldName(name: string): string {
    return this.formatFieldNamePascalCase(name);
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

  private _needsTime: boolean | null = null;

  protected needsTimeImport(database: DatabaseSchema): boolean {
    if (this._needsTime !== null) return this._needsTime;
    for (const table of database.tables) {
      for (const column of table.columns) {
        if (column.type.kind === 'date' || column.type.kind === 'datetime') {
          this._needsTime = true;
          return true;
        }
      }
    }
    this._needsTime = false;
    return false;
  }
}

/**
 * 语言生成器工厂类
 * 用于创建不同语言的生成器实例
 */
export class GeneratorFactory {
  private static registry: Record<string, new (options: Options) => AGenerator> = {};

  static register(language: string, constructor: new (options: Options) => AGenerator) {
    this.registry[language] = constructor;
  }

  static createGenerator(
    language: Language,
    options: Options = { language }
  ): AGenerator {
    const Generator = this.registry[language];
    if (!Generator) {
      throw new Error(`Unsupported language: ${language}`);
    }
    return new Generator(options);
  }
}
