import { Parser, AST } from 'node-sql-parser';
import {
  ColumnSchema,
  DatabaseSchema,
  SQLType,
  TableSchema,
  TableIndex,
  IntType,
  BigIntType,
  FloatType,
  DecimalType,
  VarcharType,
  TextType,
  BooleanType,
  DateType,
  DateTimeType,
  JsonType,
  EnumType,
} from './schema';

/**
 * Type resolver interface
 * For custom SQL type to SQLType mapping logic
 */
export interface TypeResolver {
  /**
   * Resolve SQL type definition to SQLType
   * @param def Column definition
   * @returns SQLType object
   */
  resolve(def: ColumnDefinition['definition']): SQLType | null;
}

/**
 * SQL parser configuration
 */
export interface SQLParserOptions {
  /**
   * Database dialect (affects AST parsing rules)
   */
  dialect: string;

  /**
   * Database name (used to build DatabaseSchema)
   */
  dbName?: string;

  /**
   * Enable strict mode
   * In strict mode, unrecognized types throw an error instead of falling back to text
   * Default: false
   */
  strictMode?: boolean;

  /**
   * Whether to ignore comments
   * Default: false
   */
  ignoreComments?: boolean;

  /**
   * Whether to parse foreign key constraints
   * Default: true
   */
  parseForeignKeys?: boolean;

  /**
   * Whether to parse indexes
   * Default: true
   */
  parseIndexes?: boolean;

  /**
   * Custom type resolvers
   * Used to extend or override the default type resolution logic
   */
  typeResolvers?: TypeResolver[];
}

/**
 * AST node type for CREATE TABLE statements
 */
export interface CreateTableAST {
  type: 'create';
  keyword: 'table';
  table: Array<{
    table: string;
    db?: string;
  }>;
  create_definitions?: Array<
    ColumnDefinition | ConstraintDefinition | IndexDefinition
  >;
  table_options?: Array<{
    keyword: string;
    value: string;
  }>;
}

/**
 * AST node type for column definitions
 */
export interface ColumnDefinition {
  resource: 'column';
  column: {
    column: string;
  };
  definition: {
    dataType: string;
    length?: number | number[];
    scale?: number;
    unsigned?: boolean;
    generated?: boolean;
    expr?: {
      value: Array<{
        value?: string;
        raw?: string;
      }>;
    };
  };
  nullable?: {
    type: string;
  };
  // node-sql-parser returns these as snake_case
  primary_key?: boolean;
  unique?: boolean;
  default_val?: {
    value: unknown;
  };
  comment?: {
    value: {
      value: string;
    };
  };
}

/**
 * AST node type for constraint definitions
 */
export interface ConstraintDefinition {
  resource: 'constraint';
  constraint_type: string;
  definition?: Array<{
    column: string;
  }>;
  index?: string;
  reference?: {
    table?: Array<{
      table: string;
    }>;
    definition?: Array<{
      column: string;
    }>;
  };
  table?: Array<{
    table: string;
  }>;
  on_delete?: string;
  on_update?: string;
}

/**
 * AST node type for index definitions
 */
export interface IndexDefinition {
  resource: 'index';
  index: string;
  definition?: Array<{
    column: string;
  }>;
  unique?: boolean;
  index_type?: string;
}

/**
 * Public convenience method:
 * SQL string -> DatabaseSchema
 */
export function parseSQL(
  sql: string,
  options: SQLParserOptions = { dialect: 'mysql' }
): DatabaseSchema {
  if (!sql || typeof sql !== 'string') {
    throw new Error('SQL string is required and must be a string');
  }

  try {
    const parser = new Parser();

    /**
     * Preprocess SQL string
     * 1. Remove extra whitespace
     * 2. Ensure each statement ends with a semicolon
     */
    const processedSql = sql.trim().replace(/\s+/g, ' ').replace(/;[\s;]*;/g, ';');

    /**
     * node-sql-parser produces different AST structures
     * based on the database parameter (critical)
     */
    const ast = parser.astify(processedSql, { database: options.dialect });

    if (!ast) {
      throw new Error('Failed to parse SQL: AST is null or undefined');
    }

    const astArray = Array.isArray(ast) ? ast : [ast];
    const sqlParser = new SQLParser(options);

    return sqlParser.parseDatabase(astArray);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `SQL parsing error: ${error.message}\n` +
        `Dialect: ${options.dialect}\n` +
        `SQL length: ${sql.length} characters\n` +
        `First 200 characters: ${sql.substring(0, 200)}${sql.length > 200 ? '...' : ''}`
      );
    }
    throw new Error(
      `SQL parsing error: ${String(error)}\n` +
      `Dialect: ${options.dialect}\n` +
      `SQL length: ${sql.length} characters`
    );
  }
}

/**
 * Core SQL AST -> Schema IR converter
 *
 * Responsibility: Transform node-sql-parser AST
 * into your defined DatabaseSchema (intermediate representation IR)
 */
export class SQLParser {
  options: SQLParserOptions & {
    strictMode: boolean;
    ignoreComments: boolean;
    parseForeignKeys: boolean;
    parseIndexes: boolean;
    typeResolvers: TypeResolver[];
  };
  private parser: Parser;

  constructor(options: SQLParserOptions = { dialect: 'mysql' }) {
    this.options = {
      strictMode: false,
      ignoreComments: false,
      parseForeignKeys: true,
      parseIndexes: true,
      typeResolvers: [],
      ...options,
    };
    this.parser = new Parser();
  }

  /**
   * Traverse AST, extract all CREATE TABLE statements
   */
  public parseDatabase(
    ast: AST[],
    dbName: string = this.options.dbName || 'db'
  ): DatabaseSchema {
    const db: DatabaseSchema = {
      name: dbName,
      dialect: this.options.dialect,
      tables: [],
    };

    for (const node of ast) {
      if (this.isCreateTable(node)) {
        db.tables.push(this.parseTable(node));
      }
    }

    db.tablesMap = Object.fromEntries(
      db.tables.filter(t => t.name).map(t => [t.name, t])
    );

    return db;
  }

  /**
   * Type guard: check if node is a CREATE TABLE statement
   */
  private isCreateTable(node: unknown): node is CreateTableAST {
    if (!node || typeof node !== 'object') return false;
    const n = node as Record<string, unknown>;
    return n.type === 'create' && n.keyword === 'table';
  }

  /**
   * Parse single table AST -> TableSchema
   */
  private parseTable(node: CreateTableAST): TableSchema {
    const tableName = node.table?.[0]?.table;

    if (!tableName) {
      throw new Error('Table name is required in CREATE TABLE statement');
    }

    /**
     * MySQL table comment is in table_options
     */
    const comment = node.table_options?.find(
      (o: { keyword: string; value: string }) => o.keyword === 'comment'
    )?.value;

    const table: TableSchema = {
      name: tableName,
      comment: comment?.replace(/'/g, ''),
      columns: [],
      primaryKeys: [],
      indexes: [],
    };

    /**
     * create_definitions contains mixed items:
     * - column
     * - constraint
     * - index
     */
    for (const def of node.create_definitions || []) {
      try {
        switch (def.resource) {
          case 'column':
            const col = this.parseColumn(def);
            table.columns.push(col);

            if (col.primaryKey) {
              table.primaryKeys!.push(col.name);
            }
            break;

          case 'constraint':
            this.parseTableConstraint(def, table);
            break;

          case 'index':
            this.parseIndex(def, table);
            break;
        }
      } catch (error) {
        throw new Error(
          `Error parsing table ${tableName}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return table;
  }

  /**
   * Parse column definition AST -> ColumnSchema
   *
   * Note: Field-level primary/unique and table-level definitions will overlap
   */
  private parseColumn(def: ColumnDefinition): ColumnSchema {
    const columnName = def.column?.column;

    if (!columnName) {
      throw new Error('Column name is required in column definition');
    }

    if (!def.definition) {
      throw new Error(`Column ${columnName} missing definition`);
    }

    return {
      name: columnName,

      /**
       * Abstract SQL type mapping
       */
      type: this.mapSQLType(def.definition),

      /**
       * In node-sql-parser:
       * nullable is an object; when it exists and type is "not null", it means NOT NULL
       */
      nullable: !(def.nullable && def.nullable.type === 'not null'),

      primaryKey: !!def.primary_key,
      unique: !!def.unique,

      /**
       * Default value needs to be serialized as SQL string
       */
      default: def.default_val ? this.parseDefault(def.default_val) : undefined,

      comment: def.comment?.value?.value,

      unsigned: !!def.definition.unsigned,
      generated: !!def.definition.generated,
    };
  }

  /**
   * Parse table-level PRIMARY KEY / UNIQUE / FOREIGN KEY
   */
  private parseTableConstraint(def: ConstraintDefinition, table: TableSchema) {
    const type = def.constraint_type?.toUpperCase();
    const columns =
      def.definition?.map((c: { column: string }) => c.column) || [];

    /**
     * Table-level primary key
     */
    if (type === 'PRIMARY KEY') {
      table.primaryKeys!.push(...columns);

      columns.forEach((name: string) => {
        const col = table.columns.find((c) => c.name === name);
        if (col) col.primaryKey = true;
      });
      return;
    }

    /**
     * Table-level unique index
     */
    if (
      (type === 'UNIQUE' || type === 'UNIQUE KEY') &&
      this.options.parseIndexes
    ) {
      const idx: TableIndex = {
        name: def.index || `unique_${columns.join('_')}`,
        columns,
        unique: true,
      };

      table.indexes!.push(idx);

      columns.forEach((name: string) => {
        const col = table.columns.find((c) => c.name === name);
        if (col) col.unique = true;
      });
    }

    /**
     * Table-level foreign key constraint
     */
    if (type === 'FOREIGN KEY' && this.options.parseForeignKeys) {
      // Check if referenced table info exists (compatible with different AST structures)
      let referencedTable: string | undefined;
      let referencedColumns: string[] = [];

      // Try multiple possible AST structures
      if ('reference' in def && def.reference) {
        // Standard structure
        referencedTable = def.reference.table?.[0]?.table;
        referencedColumns =
          def.reference.definition?.map((c: { column: string }) => c.column) ||
          [];
      } else if ('table' in def && def.table) {
        // Alternative structure 1
        referencedTable = def.table?.[0]?.table;
        referencedColumns =
          def.definition?.map((c: { column: string }) => c.column) || [];
      }

      if (referencedTable && referencedColumns.length > 0) {
        if (!table.foreignKeys) {
          table.foreignKeys = [];
        }

        table.foreignKeys.push({
          name: def.index,
          columns,
          referencedTable,
          referencedColumns,
          onDelete: def.on_delete,
          onUpdate: def.on_update,
        });
      }
    }
  }

  /**
   * Parse regular index
   */
  private parseIndex(def: IndexDefinition, table: TableSchema) {
    if (this.options.parseIndexes) {
      table.indexes!.push({
        name: def.index,
        columns: def.definition?.map((c: { column: string }) => c.column) || [],
        unique: !!def.unique,
        type: def.index_type,
      });
    }
  }

  /**
   * Default type resolver
   * Provides basic SQL type to SQLType mapping logic
   */
  private defaultTypeResolver: TypeResolver = {
    resolve: (def: ColumnDefinition['definition']): SQLType | null => {
      if (!def || !def.dataType) {
        const textType: TextType = { kind: 'text' };
        return textType;
      }

      const dt = def.dataType.toLowerCase();

      switch (dt) {
        case 'int':
        case 'integer':
        case 'smallint':
        case 'mediumint':
        case 'year':
          const intType: IntType = {
            kind: 'int',
            length: Array.isArray(def.length) ? def.length[0] : def.length,
          };
          return intType;

        case 'bigint':
          const bigIntType: BigIntType = {
            kind: 'bigint',
            length: Array.isArray(def.length) ? def.length[0] : def.length,
          };
          return bigIntType;

        case 'float':
        case 'double':
          const floatType: FloatType = {
            kind: 'float',
            precision: Array.isArray(def.length) ? def.length[0] : def.length,
            scale:
              Array.isArray(def.length) && def.length[1]
                ? def.length[1]
                : def.scale,
          };
          return floatType;

        case 'decimal':
          const decimalType: DecimalType = {
            kind: 'decimal',
            precision: Array.isArray(def.length) ? def.length[0] : def.length,
            scale:
              Array.isArray(def.length) && def.length[1]
                ? def.length[1]
                : def.scale,
          };
          return decimalType;

        case 'varchar':
          const varcharType: VarcharType = {
            kind: 'varchar',
            length: Array.isArray(def.length) ? def.length[0] : def.length,
          };
          return varcharType;

        case 'text':
        case 'longtext':
        case 'blob':
        case 'time':
          const textType: TextType = { kind: 'text' };
          return textType;

        case 'boolean':
          const booleanType: BooleanType = { kind: 'boolean' };
          return booleanType;

        case 'tinyint':
          // Only treat as boolean when length is 1
          if (
            def.length &&
            (Array.isArray(def.length) ? def.length[0] === 1 : def.length === 1)
          ) {
            const booleanType: BooleanType = { kind: 'boolean' };
            return booleanType;
          }
          const tinyIntType: IntType = { kind: 'int' };
          return tinyIntType;

        case 'date':
          const dateType: DateType = { kind: 'date' };
          return dateType;

        case 'datetime':
        case 'timestamp':
          const dateTimeType: DateTimeType = { kind: 'datetime' };
          return dateTimeType;

        case 'json':
          const jsonType: JsonType = { kind: 'json' };
          return jsonType;

        case 'enum':
          // Fix enum type resolution
          // Get enum values from expr.value
          if (def.expr && def.expr.value) {
            const values = def.expr.value.map(
              (v: { value?: string; raw?: unknown }) => {
                let value: string;
                if (v.value) {
                  value = v.value;
                } else if (v.raw) {
                  value = String(v.raw);
                } else {
                  value = String(v);
                }
                // Remove possible quotes
                return value.replace(/^['"]|['"]$/g, '');
              }
            );
            const enumType: EnumType = {
              kind: 'enum',
              values: values,
            };
            return enumType;
          }
          const emptyEnumType: EnumType = {
            kind: 'enum',
            values: [],
          };
          return emptyEnumType;

        /**
         * Unrecognized types fall back to text by default to avoid parse failure
         * In strict mode, unrecognized types throw an error
         */
        default:
          if (this.options.strictMode) {
            throw new Error(`Unsupported SQL type: ${dt}`);
          }
          const defaultTextType: TextType = { kind: 'text' };
          return defaultTextType;
      }
    },
  };

  /**
   * SQL AST type -> SQLType (cross-dialect abstraction)
   */
  private mapSQLType(def: ColumnDefinition['definition']): SQLType {
    // Merge user-defined type resolvers and default type resolver
    const allResolvers = [
      ...this.options.typeResolvers,
      this.defaultTypeResolver,
    ];

    // Try all type resolvers
    for (const resolver of allResolvers) {
      const result = resolver.resolve(def);
      if (result) {
        return result;
      }
    }

    // If all resolvers return null, default to text type
    const textType: TextType = { kind: 'text' };
    return textType;
  }

  /**
   * Default value AST -> SQL string
   *
   * Uses sqlify to ensure functions/expressions are serialized correctly
   */
  private parseDefault(def: { value: unknown }): string | null {
    const val = def.value as Record<string, unknown> | null;
    if (val?.type === 'null' || val === null) {
      return null;
    }

    try {
      return this.parser.sqlify(val as any);
    } catch {
      if (val?.type === 'function') {
        const name = val.name as Record<string, unknown> | undefined;
        const firstName = name?.name as Array<Record<string, unknown>> | undefined;
        if (firstName?.[0]?.value) {
          return String(firstName[0].value);
        }
      }
      const inner = val as Record<string, unknown> | undefined;
      return String(inner?.value ?? val);
    }
  }
}
