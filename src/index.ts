// 导出数据库相关的类型定义
export type {
  /** 数据库的整体模式，包括所有表、视图和索引等信息 */
  DatabaseSchema,
  /** 单个表的结构定义，包括列、索引和约束 */
  TableSchema,
  /** 表中列的结构定义，包括名称、类型、是否可为空等 */
  ColumnSchema,
  /** 表索引的定义，包括索引名称、列和类型 */
  TableIndex,
  /** SQL 数据类型定义，如 VARCHAR, INT, BOOLEAN 等 */
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

// 导出 SQL 解析相关的工具和类型
export {
  /** 将 SQL 字符串解析成可操作的抽象语法树（AST） */
  parseSQL,
  /** SQL 解析器类，支持多步解析和自定义解析规则 */
  SQLParser,
} from './sql-parser';

export type {
  /** SQL 解析器可选配置，例如是否区分大小写、解析模式等 */
  SQLParserOptions,
  /** 自定义类型解析器接口，用于扩展 SQL 类型映射 */
  TypeResolver,
} from './sql-parser';

// 导出语言生成器相关的工具和类型
export {
  BaseGenerator,
  GeneratorFactory,
  GormGenerator,
  XormGenerator,
  TypeScriptGenerator,
  GoGenerator,
} from './generator';

// 导出 CLI 相关的类型定义
export type {
  /** 代码生成选项 */
  GenerateOptions,
} from './cli/output';

export { generateCode } from './generate';

// 导出 Reader 相关的工具函数
export { readSQLFromFile, readSQLFromString } from './reader';
