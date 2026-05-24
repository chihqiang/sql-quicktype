/**
 * Abstract representation of a database (Database AST / IR)
 * Use cases:
 * - Parse DDL into structured representation
 * - Generate DDL from structure
 * - Schema diff / migration tools
 * - Visualize database structure
 */
export interface DatabaseSchema {
  /** Database name */
  name: string;

  /** Database dialect (determines type mapping, DDL generation strategy), values: mysql | postgres | sqlite | sqlserver */
  dialect: string;

  /** Default charset (commonly used by MySQL) */
  charset?: string;

  /** Default collation (commonly used by MySQL) */
  collation?: string;

  /** Database comment */
  comment?: string;

  /** Table collection (core) */
  tables: TableSchema[];

  /**
   * Metadata (not involved in DDL generation, but useful for tools)
   * e.g., source, version, parse time, engine, etc.
   */
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    version?: string;
    engine?: string;
    [key: string]: unknown;
  };

  /**
   * Runtime fast index (non-persistent field)
   * name -> TableSchema
   */
  tablesMap?: Record<string, TableSchema>;
}

/**
 * Abstract representation of a table structure
 */
export interface TableSchema {
  /** Table name */
  name: string;

  /** Table comment */
  comment?: string;

  /** Schema name (commonly used by PostgreSQL / SQL Server) */
  schema?: string;

  /** Primary key column names */
  primaryKeys?: string[];

  /** Whether auto-increment primary key exists (affects DDL generation strategy) */
  autoIncrement?: boolean;

  /** Column definitions (core) */
  columns: ColumnSchema[];

  /** Foreign key definitions */
  foreignKeys?: TableForeignKey[];

  /** Index definitions */
  indexes?: TableIndex[];
}

/**
 * Table foreign key definition
 */
export interface TableForeignKey {
  /** Foreign key name */
  name?: string;

  /** Foreign key columns */
  columns: string[];

  /** Referenced table name */
  referencedTable: string;

  /** Referenced column names */
  referencedColumns: string[];

  /** Cascade delete strategy */
  onDelete?: string;

  /** Cascade update strategy */
  onUpdate?: string;
}

/**
 * Abstract representation of a column
 */
export interface ColumnSchema {
  /** Column name */
  name: string;

  /** Abstract SQL type (cross-dialect type system) */
  type: SQLType;

  /** Whether NULL is allowed */
  nullable: boolean;

  /** Whether this is a primary key column (redundant field for quick check) */
  primaryKey: boolean;

  /** Whether unique */
  unique: boolean;

  /** Default value expression (preserved as SQL string) */
  default?: string | null;

  /** Column comment */
  comment?: string;

  /** Whether unsigned (MySQL specific) */
  unsigned?: boolean;

  /** Whether this is a generated column */
  generated?: boolean;
}

/**
 * Table index definition
 */
export interface TableIndex {
  /** Index name */
  name: string;

  /** Index column order (order is important) */
  columns: string[];

  /** Whether unique index */
  unique?: boolean;

  /** Index type: BTREE / HASH / FULLTEXT / GIN, etc. */
  type?: string;
}

/**
 * SQL type union
 */
export type SQLType =
  | IntType
  | BigIntType
  | FloatType
  | DecimalType
  | VarcharType
  | TextType
  | BooleanType
  | DateType
  | DateTimeType
  | JsonType
  | EnumType;

/**
 * Cross-dialect SQL type abstraction layer
 * This is the most critical layer of the IR: type system mapping
 */

/**
 * Integer type
 */
export interface IntType {
  kind: 'int';
  /** Display width (e.g., INT(10)) */
  length?: number;
}

/**
 * Big integer type
 */
export interface BigIntType {
  kind: 'bigint';
  /** Display width (e.g., BIGINT(20)) */
  length?: number;
}

/**
 * Float type
 */
export interface FloatType {
  kind: 'float';
  /** Precision (e.g., 10 in FLOAT(10,2)) */
  precision?: number;
  /** Scale (e.g., 2 in FLOAT(10,2)) */
  scale?: number;
}

/**
 * Decimal type
 */
export interface DecimalType {
  kind: 'decimal';
  precision?: number;
  scale?: number;
}

/**
 * Variable-length string type
 */
export interface VarcharType {
  kind: 'varchar';
  length?: number;
}

/**
 * Text type
 */
export interface TextType {
  kind: 'text';
}

/**
 * Boolean type
 */
export interface BooleanType {
  kind: 'boolean';
}

/**
 * Date type
 */
export interface DateType {
  kind: 'date';
}

/**
 * Datetime type
 */
export interface DateTimeType {
  kind: 'datetime';
}

/**
 * JSON type
 */
export interface JsonType {
  kind: 'json';
}

/**
 * Enum type
 */
export interface EnumType {
  kind: 'enum';
  values: string[];
}
