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
 * 类型解析器接口
 * 用于自定义 SQL 类型到 SQLType 的映射逻辑
 */
export interface TypeResolver {
  /**
   * 解析 SQL 类型定义为 SQLType
   * @param def 列定义
   * @returns SQLType 对象
   */
  resolve(def: ColumnDefinition['definition']): SQLType | null;
}

/**
 * SQL 解析器配置
 */
export interface SQLParserOptions {
  /**
   * 数据库方言（影响 AST 解析规则）
   */
  dialect: string;

  /**
   * 数据库名称（用于构建 DatabaseSchema）
   */
  dbName?: string;

  /**
   * 是否启用严格模式
   * 在严格模式下，遇到未识别的类型会抛出错误而不是默认降级为 text
   * 默认值：false
   */
  strictMode?: boolean;

  /**
   * 是否忽略注释
   * 默认值：false
   */
  ignoreComments?: boolean;

  /**
   * 是否解析外键约束
   * 默认值：true
   */
  parseForeignKeys?: boolean;

  /**
   * 是否解析索引
   * 默认值：true
   */
  parseIndexes?: boolean;

  /**
   * 自定义类型解析器
   * 用于扩展或覆盖默认的类型解析逻辑
   */
  typeResolvers?: TypeResolver[];
}

/**
 * CREATE TABLE 语句的 AST 节点类型
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
 * 列定义的 AST 节点类型
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
 * 约束定义的 AST 节点类型
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
 * 索引定义的 AST 节点类型
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
 * 对外暴露的便捷方法：
 * SQL 字符串 -> DatabaseSchema
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
     * 预处理 SQL 字符串
     * 1. 移除多余的空白字符
     * 2. 确保每个语句都以分号结尾
     */
    const processedSql = sql.trim().replace(/\s+/g, ' ').replace(/;[\s;]*;/g, ';');

    /**
     * node-sql-parser 会根据 database 参数
     * 产生不同结构的 AST（非常关键）
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
 * 核心 SQL AST -> Schema IR 转换器
 *
 * 职责：把 node-sql-parser 的 AST
 * 转成你定义的 DatabaseSchema（中间表示层 IR）
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
   * 遍历 AST，提取所有 CREATE TABLE
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
   * 类型守卫：判断是否为 CREATE TABLE 语句
   */
  private isCreateTable(node: unknown): node is CreateTableAST {
    if (!node || typeof node !== 'object') return false;
    const n = node as Record<string, unknown>;
    return n.type === 'create' && n.keyword === 'table';
  }

  /**
   * 解析单表 AST -> TableSchema
   */
  private parseTable(node: CreateTableAST): TableSchema {
    const tableName = node.table?.[0]?.table;

    if (!tableName) {
      throw new Error('Table name is required in CREATE TABLE statement');
    }

    /**
     * MySQL 表注释在 table_options 中
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
     * create_definitions 中混杂：
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
   * 解析列定义 AST -> ColumnSchema
   *
   * 注意：字段级 primary/unique 与表级定义会叠加
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
       * 抽象 SQL 类型映射
       */
      type: this.mapSQLType(def.definition),

      /**
       * node-sql-parser 中：
       * nullable 是一个对象，当它存在且 type 是 "not null" 时，表示 NOT NULL
       */
      nullable: !(def.nullable && def.nullable.type === 'not null'),

      primaryKey: !!def.primary_key,
      unique: !!def.unique,

      /**
       * 默认值需要序列化为 SQL 字符串
       */
      default: def.default_val ? this.parseDefault(def.default_val) : undefined,

      comment: def.comment?.value?.value,

      unsigned: !!def.definition.unsigned,
      generated: !!def.definition.generated,
    };
  }

  /**
   * 解析表级 PRIMARY KEY / UNIQUE / FOREIGN KEY
   */
  private parseTableConstraint(def: ConstraintDefinition, table: TableSchema) {
    const type = def.constraint_type?.toUpperCase();
    const columns =
      def.definition?.map((c: { column: string }) => c.column) || [];

    /**
     * 表级主键
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
     * 表级唯一索引
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
     * 表级外键约束
     */
    if (type === 'FOREIGN KEY' && this.options.parseForeignKeys) {
      // 检查是否有引用表信息（兼容不同版本的AST结构）
      let referencedTable: string | undefined;
      let referencedColumns: string[] = [];

      // 尝试多种可能的AST结构
      if ('reference' in def && def.reference) {
        // 标准结构
        referencedTable = def.reference.table?.[0]?.table;
        referencedColumns =
          def.reference.definition?.map((c: { column: string }) => c.column) ||
          [];
      } else if ('table' in def && def.table) {
        // 备选结构1
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
   * 解析普通索引
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
   * 默认类型解析器
   * 提供基本的 SQL 类型到 SQLType 的映射逻辑
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
          // 只有当长度为 1 时才视为 boolean
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
          // 修复枚举类型解析
          // 从 expr.value 中获取枚举值
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
                // 去除可能的引号
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
         * 未识别类型默认降级为 text，避免解析失败
         * 在严格模式下，遇到未识别的类型会抛出错误
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
   * SQL AST 类型 -> SQLType（跨方言抽象）
   */
  private mapSQLType(def: ColumnDefinition['definition']): SQLType {
    // 合并用户自定义的类型解析器和默认类型解析器
    const allResolvers = [
      ...this.options.typeResolvers,
      this.defaultTypeResolver,
    ];

    // 尝试使用所有类型解析器
    for (const resolver of allResolvers) {
      const result = resolver.resolve(def);
      if (result) {
        return result;
      }
    }

    // 如果所有解析器都返回 null，默认返回 text 类型
    const textType: TextType = { kind: 'text' };
    return textType;
  }

  /**
   * 默认值 AST -> SQL 字符串
   *
   * 使用 sqlify 确保函数/表达式被正确序列化
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
