/**
 * 整个数据库的抽象表示（Database AST / IR）
 * 可用于：
 * - 解析 DDL -> 结构化表示
 * - 根据结构生成 DDL
 * - Schema Diff / 迁移工具
 * - 可视化数据库结构
 */
export interface DatabaseSchema {
  /** 数据库名 */
  name: string;

  /** 数据库方言（决定类型映射、DDL 生成策略），可选值：mysql | postgres | sqlite | sqlserver */
  dialect: string;

  /** 默认字符集（MySQL 常用） */
  charset?: string;

  /** 默认排序规则（MySQL 常用） */
  collation?: string;

  /** 数据库注释 */
  comment?: string;

  /** 表集合（核心） */
  tables: TableSchema[];

  /**
   * 元信息（不参与 DDL 生成，但对工具有用）
   * 比如来源、版本、解析时间、引擎等
   */
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    version?: string;
    engine?: string;
    [key: string]: unknown;
  };

  /**
   * 运行时构建的快速索引（非持久字段）
   * name -> TableSchema
   */
  tablesMap?: Record<string, TableSchema>;
}

/**
 * 表结构的抽象表示
 */
export interface TableSchema {
  /** 表名 */
  name: string;

  /** 表注释 */
  comment?: string;

  /** 所属 schema（Postgres / SQLServer 常用） */
  schema?: string;

  /** 主键列名集合 */
  primaryKeys?: string[];

  /** 是否存在自增主键（影响 DDL 生成策略） */
  autoIncrement?: boolean;

  /** 列定义（核心） */
  columns: ColumnSchema[];

  /** 外键定义 */
  foreignKeys?: TableForeignKey[];

  /** 索引定义 */
  indexes?: TableIndex[];
}

/**
 * 表外键定义
 */
export interface TableForeignKey {
  /** 外键名 */
  name?: string;

  /** 外键列 */
  columns: string[];

  /** 引用表名 */
  referencedTable: string;

  /** 引用列名 */
  referencedColumns: string[];

  /** 级联删除策略 */
  onDelete?: string;

  /** 级联合并策略 */
  onUpdate?: string;
}

/**
 * 列的抽象表示
 */
export interface ColumnSchema {
  /** 列名 */
  name: string;

  /** 抽象 SQL 类型（跨方言类型系统） */
  type: SQLType;

  /** 是否允许为 NULL */
  nullable: boolean;

  /** 是否为主键列（冗余字段，便于快速判断） */
  primaryKey: boolean;

  /** 是否唯一 */
  unique: boolean;

  /** 默认值表达式（字符串形式保留 SQL 原样） */
  default?: string | null;

  /** 列注释 */
  comment?: string;

  /** 是否 unsigned（MySQL 特有） */
  unsigned?: boolean;

  /** 是否为计算列 / 生成列（generated column） */
  generated?: boolean;
}

/**
 * 表索引定义
 */
export interface TableIndex {
  /** 索引名 */
  name: string;

  /** 索引列顺序（顺序非常重要） */
  columns: string[];

  /** 是否唯一索引 */
  unique?: boolean;

  /** 索引类型：BTREE / HASH / FULLTEXT / GIN 等 */
  type?: string;
}

/**
 * SQL 类型联合
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
 * 跨方言 SQL 类型的统一抽象层
 * 这是整个 IR 最关键的一层：类型系统映射
 */

/**
 * 整数类型
 */
export interface IntType {
  kind: 'int';
  /** 显示宽度（如 INT(10)） */
  length?: number;
}

/**
 * 长整数类型
 */
export interface BigIntType {
  kind: 'bigint';
  /** 显示宽度（如 BIGINT(20)） */
  length?: number;
}

/**
 * 浮点数类型
 */
export interface FloatType {
  kind: 'float';
  /** 精度（如 FLOAT(10,2) 中的 10） */
  precision?: number;
  /** 小数位数（如 FLOAT(10,2) 中的 2） */
  scale?: number;
}

/**
 * 小数类型
 */
export interface DecimalType {
  kind: 'decimal';
  precision?: number;
  scale?: number;
}

/**
 * 变长字符串类型
 */
export interface VarcharType {
  kind: 'varchar';
  length?: number;
}

/**
 * 文本类型
 */
export interface TextType {
  kind: 'text';
}

/**
 * 布尔类型
 */
export interface BooleanType {
  kind: 'boolean';
}

/**
 * 日期类型
 */
export interface DateType {
  kind: 'date';
}

/**
 * 日期时间类型
 */
export interface DateTimeType {
  kind: 'datetime';
}

/**
 * JSON 类型
 */
export interface JsonType {
  kind: 'json';
}

/**
 * 枚举类型
 */
export interface EnumType {
  kind: 'enum';
  values: string[];
}
