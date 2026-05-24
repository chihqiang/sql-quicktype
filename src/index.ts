// Database-related type definitions
export type {
  /** Database schema including all tables, views and indexes */
  DatabaseSchema,
  /** Table structure definition including columns, indexes and constraints */
  TableSchema,
  /** Column structure definition including name, type, nullable, etc. */
  ColumnSchema,
  /** Table index definition including name, columns and type */
  TableIndex,
  /** SQL data type definitions like VARCHAR, INT, BOOLEAN, etc. */
  SQLType,
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

// SQL parser tools and types
export {
  /** Parse SQL string into an actionable AST */
  parseSQL,
  /** SQL parser class with multi-step parsing and custom rules */
  SQLParser,
} from './sql-parser';

export type {
  /** Optional SQL parser configuration */
  SQLParserOptions,
  /** Custom type resolver interface for extending SQL type mapping */
  TypeResolver,
} from './sql-parser';

// Language generator tools and types
export {
  BaseGenerator,
  GeneratorFactory,
  GormGenerator,
  XormGenerator,
  TypeScriptGenerator,
  GoGenerator,
} from './generator';

// CLI-related types
export type {
  /** Code generation options */
  GenerateOptions,
} from './cli/output';

export { generateCode } from './generate';

