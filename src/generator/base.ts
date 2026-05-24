import { ColumnSchema, DatabaseSchema, SQLType, TableSchema } from '../schema';
import type { Language } from '../constants';

/**
 * Generator options
 */
export interface Options {
  /**
   * Target language
   */
  language: Language;

  /**
   * Whether to generate comments (default: true)
   */
  generateComments?: boolean;

  /**
   * Namespace/package name (for Go, GORM, XORM, etc.)
   */
  namespace?: string;
}

/**
 * Base language generator class
 * Defines common interface and methods for generating code in different languages
 */
export abstract class BaseGenerator {
  /**
   * Generate type definitions for the entire database schema
   */
  abstract generateDatabase(database: DatabaseSchema): string;

  /**
   * Generate type definitions for a single table
   */
  abstract generateTable(table: TableSchema): string;

  /**
   * Generate column type definition
   */
  abstract generateColumn(column: ColumnSchema): string;

  /**
   * Map SQL type to target language type
   */
  abstract mapSQLType(type: SQLType): string;

  /**
   * Format type name (e.g., PascalCase)
   */
  protected formatTypeName(name: string): string {
    return name
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Format field name
   */
  protected formatPascalCase(name: string): string {
    return name
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
  }

  protected formatFieldName(name: string): string {
    return this.formatPascalCase(name);
  }

  /**
   * Generate default value
   */
  protected generateDefaultValue(column: ColumnSchema): string {
    if (!column.default) {
      return '';
    }
    return column.default;
  }

  private needsTimeCache: boolean | null = null;

  protected needsTimeImport(database: DatabaseSchema): boolean {
    if (this.needsTimeCache !== null) return this.needsTimeCache;
    for (const table of database.tables) {
      for (const column of table.columns) {
        if (column.type.kind === 'date' || column.type.kind === 'datetime') {
          this.needsTimeCache = true;
          return true;
        }
      }
    }
    this.needsTimeCache = false;
    return false;
  }
}

/**
 * Language generator factory
 * Used to create generator instances for different languages
 */
export class GeneratorFactory {
  private static registry: Record<
    string,
    new (options: Options) => BaseGenerator
  > = {};

  static register(
    language: string,
    constructor: new (options: Options) => BaseGenerator
  ) {
    this.registry[language] = constructor;
  }

  static createGenerator(
    language: Language,
    options: Options = { language }
  ): BaseGenerator {
    const Generator = this.registry[language];
    if (!Generator) {
      throw new Error(`Unsupported language: ${language}`);
    }
    return new Generator(options);
  }
}
