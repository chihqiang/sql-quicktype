"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  BaseGenerator: () => BaseGenerator,
  GeneratorFactory: () => GeneratorFactory,
  GoGenerator: () => GoGenerator,
  GormGenerator: () => GormGenerator,
  SQLParser: () => SQLParser,
  TypeScriptGenerator: () => TypeScriptGenerator,
  XormGenerator: () => XormGenerator,
  generateCode: () => generateCode,
  parseSQL: () => parseSQL,
  readSQLFromFile: () => readSQLFromFile,
  readSQLFromString: () => readSQLFromString
});
module.exports = __toCommonJS(index_exports);

// src/sql-parser.ts
var import_node_sql_parser = require("node-sql-parser");
function parseSQL(sql, options = { dialect: "mysql" }) {
  if (!sql || typeof sql !== "string") {
    throw new Error("SQL string is required and must be a string");
  }
  try {
    const parser = new import_node_sql_parser.Parser();
    const processedSql = sql.trim().replace(/\s+/g, " ").replace(/;[\s;]*;/g, ";");
    const ast = parser.astify(processedSql, { database: options.dialect });
    if (!ast) {
      throw new Error("Failed to parse SQL: AST is null or undefined");
    }
    const astArray = Array.isArray(ast) ? ast : [ast];
    const sqlParser = new SQLParser(options);
    return sqlParser.parseDatabase(astArray);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `SQL parsing error: ${error.message}
Dialect: ${options.dialect}
SQL length: ${sql.length} characters
First 200 characters: ${sql.substring(0, 200)}${sql.length > 200 ? "..." : ""}`
      );
    }
    throw new Error(
      `SQL parsing error: ${String(error)}
Dialect: ${options.dialect}
SQL length: ${sql.length} characters`
    );
  }
}
var SQLParser = class {
  constructor(options = { dialect: "mysql" }) {
    /**
     * 默认类型解析器
     * 提供基本的 SQL 类型到 SQLType 的映射逻辑
     */
    this.defaultTypeResolver = {
      resolve: (def) => {
        if (!def || !def.dataType) {
          const textType = { kind: "text" };
          return textType;
        }
        const dt = def.dataType.toLowerCase();
        switch (dt) {
          case "int":
          case "integer":
          case "smallint":
          case "mediumint":
          case "year":
            const intType = {
              kind: "int",
              length: Array.isArray(def.length) ? def.length[0] : def.length
            };
            return intType;
          case "bigint":
            const bigIntType = {
              kind: "bigint",
              length: Array.isArray(def.length) ? def.length[0] : def.length
            };
            return bigIntType;
          case "float":
          case "double":
            const floatType = {
              kind: "float",
              precision: Array.isArray(def.length) ? def.length[0] : def.length,
              scale: Array.isArray(def.length) && def.length[1] ? def.length[1] : def.scale
            };
            return floatType;
          case "decimal":
            const decimalType = {
              kind: "decimal",
              precision: Array.isArray(def.length) ? def.length[0] : def.length,
              scale: Array.isArray(def.length) && def.length[1] ? def.length[1] : def.scale
            };
            return decimalType;
          case "varchar":
            const varcharType = {
              kind: "varchar",
              length: Array.isArray(def.length) ? def.length[0] : def.length
            };
            return varcharType;
          case "text":
          case "longtext":
          case "blob":
          case "time":
            const textType = { kind: "text" };
            return textType;
          case "boolean":
            const booleanType = { kind: "boolean" };
            return booleanType;
          case "tinyint":
            if (def.length && (Array.isArray(def.length) ? def.length[0] === 1 : def.length === 1)) {
              const booleanType2 = { kind: "boolean" };
              return booleanType2;
            }
            const tinyIntType = { kind: "int" };
            return tinyIntType;
          case "date":
            const dateType = { kind: "date" };
            return dateType;
          case "datetime":
          case "timestamp":
            const dateTimeType = { kind: "datetime" };
            return dateTimeType;
          case "json":
            const jsonType = { kind: "json" };
            return jsonType;
          case "enum":
            if (def.expr && def.expr.value) {
              const values = def.expr.value.map(
                (v) => {
                  let value;
                  if (v.value) {
                    value = v.value;
                  } else if (v.raw) {
                    value = String(v.raw);
                  } else {
                    value = String(v);
                  }
                  return value.replace(/^['"]|['"]$/g, "");
                }
              );
              const enumType = {
                kind: "enum",
                values
              };
              return enumType;
            }
            const emptyEnumType = {
              kind: "enum",
              values: []
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
            const defaultTextType = { kind: "text" };
            return defaultTextType;
        }
      }
    };
    this.options = {
      strictMode: false,
      ignoreComments: false,
      parseForeignKeys: true,
      parseIndexes: true,
      typeResolvers: [],
      ...options
    };
    this.parser = new import_node_sql_parser.Parser();
  }
  /**
   * 遍历 AST，提取所有 CREATE TABLE
   */
  parseDatabase(ast, dbName = this.options.dbName || "db") {
    const db = {
      name: dbName,
      dialect: this.options.dialect,
      tables: []
    };
    for (const node of ast) {
      if (this.isCreateTable(node)) {
        db.tables.push(this.parseTable(node));
      }
    }
    db.tablesMap = Object.fromEntries(
      db.tables.filter((t) => t.name).map((t) => [t.name, t])
    );
    return db;
  }
  /**
   * 类型守卫：判断是否为 CREATE TABLE 语句
   */
  isCreateTable(node) {
    if (!node || typeof node !== "object") return false;
    const n = node;
    return n.type === "create" && n.keyword === "table";
  }
  /**
   * 解析单表 AST -> TableSchema
   */
  parseTable(node) {
    var _a, _b, _c, _d;
    const tableName = (_b = (_a = node.table) == null ? void 0 : _a[0]) == null ? void 0 : _b.table;
    if (!tableName) {
      throw new Error("Table name is required in CREATE TABLE statement");
    }
    const comment = (_d = (_c = node.table_options) == null ? void 0 : _c.find(
      (o) => o.keyword === "comment"
    )) == null ? void 0 : _d.value;
    const table = {
      name: tableName,
      comment: comment == null ? void 0 : comment.replace(/'/g, ""),
      columns: [],
      primaryKeys: [],
      indexes: []
    };
    for (const def of node.create_definitions || []) {
      try {
        switch (def.resource) {
          case "column":
            const col = this.parseColumn(def);
            table.columns.push(col);
            if (col.primaryKey) {
              table.primaryKeys.push(col.name);
            }
            break;
          case "constraint":
            this.parseTableConstraint(def, table);
            break;
          case "index":
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
  parseColumn(def) {
    var _a, _b, _c;
    const columnName = (_a = def.column) == null ? void 0 : _a.column;
    if (!columnName) {
      throw new Error("Column name is required in column definition");
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
      nullable: !(def.nullable && def.nullable.type === "not null"),
      primaryKey: !!def.primary_key,
      unique: !!def.unique,
      /**
       * 默认值需要序列化为 SQL 字符串
       */
      default: def.default_val ? this.parseDefault(def.default_val) : void 0,
      comment: (_c = (_b = def.comment) == null ? void 0 : _b.value) == null ? void 0 : _c.value,
      unsigned: !!def.definition.unsigned,
      generated: !!def.definition.generated
    };
  }
  /**
   * 解析表级 PRIMARY KEY / UNIQUE / FOREIGN KEY
   */
  parseTableConstraint(def, table) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const type = (_a = def.constraint_type) == null ? void 0 : _a.toUpperCase();
    const columns = ((_b = def.definition) == null ? void 0 : _b.map((c) => c.column)) || [];
    if (type === "PRIMARY KEY") {
      table.primaryKeys.push(...columns);
      columns.forEach((name) => {
        const col = table.columns.find((c) => c.name === name);
        if (col) col.primaryKey = true;
      });
      return;
    }
    if ((type === "UNIQUE" || type === "UNIQUE KEY") && this.options.parseIndexes) {
      const idx = {
        name: def.index || `unique_${columns.join("_")}`,
        columns,
        unique: true
      };
      table.indexes.push(idx);
      columns.forEach((name) => {
        const col = table.columns.find((c) => c.name === name);
        if (col) col.unique = true;
      });
    }
    if (type === "FOREIGN KEY" && this.options.parseForeignKeys) {
      let referencedTable;
      let referencedColumns = [];
      if ("reference" in def && def.reference) {
        referencedTable = (_d = (_c = def.reference.table) == null ? void 0 : _c[0]) == null ? void 0 : _d.table;
        referencedColumns = ((_e = def.reference.definition) == null ? void 0 : _e.map((c) => c.column)) || [];
      } else if ("table" in def && def.table) {
        referencedTable = (_g = (_f = def.table) == null ? void 0 : _f[0]) == null ? void 0 : _g.table;
        referencedColumns = ((_h = def.definition) == null ? void 0 : _h.map((c) => c.column)) || [];
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
          onUpdate: def.on_update
        });
      }
    }
  }
  /**
   * 解析普通索引
   */
  parseIndex(def, table) {
    var _a;
    if (this.options.parseIndexes) {
      table.indexes.push({
        name: def.index,
        columns: ((_a = def.definition) == null ? void 0 : _a.map((c) => c.column)) || [],
        unique: !!def.unique,
        type: def.index_type
      });
    }
  }
  /**
   * SQL AST 类型 -> SQLType（跨方言抽象）
   */
  mapSQLType(def) {
    const allResolvers = [
      ...this.options.typeResolvers,
      this.defaultTypeResolver
    ];
    for (const resolver of allResolvers) {
      const result = resolver.resolve(def);
      if (result) {
        return result;
      }
    }
    const textType = { kind: "text" };
    return textType;
  }
  /**
   * 默认值 AST -> SQL 字符串
   *
   * 使用 sqlify 确保函数/表达式被正确序列化
   */
  parseDefault(def) {
    var _a, _b;
    const val = def.value;
    if ((val == null ? void 0 : val.type) === "null" || val === null) {
      return null;
    }
    try {
      return this.parser.sqlify(val);
    } catch (e) {
      if ((val == null ? void 0 : val.type) === "function") {
        const name = val.name;
        const firstName = name == null ? void 0 : name.name;
        if ((_a = firstName == null ? void 0 : firstName[0]) == null ? void 0 : _a.value) {
          return String(firstName[0].value);
        }
      }
      const inner = val;
      return String((_b = inner == null ? void 0 : inner.value) != null ? _b : val);
    }
  }
};

// src/generator/base.ts
var BaseGenerator = class {
  constructor() {
    this.needsTimeCache = null;
  }
  /**
   * 格式化类型名称（如驼峰命名、帕斯卡命名等）
   */
  formatTypeName(name) {
    return name.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join("");
  }
  /**
   * 格式化字段名称
   */
  formatPascalCase(name) {
    return name.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join("");
  }
  formatFieldName(name) {
    return this.formatPascalCase(name);
  }
  /**
   * 生成默认值
   */
  generateDefaultValue(column) {
    if (!column.default) {
      return "";
    }
    return column.default;
  }
  needsTimeImport(database) {
    if (this.needsTimeCache !== null) return this.needsTimeCache;
    for (const table of database.tables) {
      for (const column of table.columns) {
        if (column.type.kind === "date" || column.type.kind === "datetime") {
          this.needsTimeCache = true;
          return true;
        }
      }
    }
    this.needsTimeCache = false;
    return false;
  }
};
var GeneratorFactory = class {
  static register(language, constructor) {
    this.registry[language] = constructor;
  }
  static createGenerator(language, options = { language }) {
    const Generator = this.registry[language];
    if (!Generator) {
      throw new Error(`Unsupported language: ${language}`);
    }
    return new Generator(options);
  }
};
GeneratorFactory.registry = {};

// src/generator/typescript-generator.ts
var TypeScriptGenerator = class extends BaseGenerator {
  constructor(options = { language: "typescript" }) {
    super();
    this.options = options;
  }
  /**
   * 格式化字段名称（使用驼峰命名）
   */
  formatFieldName(name) {
    return name.split("_").map((part, index) => {
      if (index === 0) {
        return part.toLowerCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }).join("");
  }
  /**
   * 生成整个数据库模式的类型定义
   */
  generateDatabase(database) {
    let result = `// Database: ${database.name}
`;
    result += `// Dialect: ${database.dialect}

`;
    for (const table of database.tables) {
      result += this.generateTable(table);
      result += "\n";
    }
    return result;
  }
  /**
   * 生成单个表的类型定义
   */
  generateTable(table) {
    let result = `// ${table.name} \u8868\u7ED3\u6784
`;
    result += `export interface ${this.formatTypeName(table.name)} {
`;
    for (const column of table.columns) {
      result += this.generateColumn(column);
    }
    result += "}\n";
    return result;
  }
  /**
   * 生成列的类型定义
   */
  generateColumn(column) {
    const fieldName = this.formatFieldName(column.name);
    const typeName = this.mapSQLType(column.type, column.name);
    const optional = column.nullable ? "?" : "";
    let result = `	${fieldName}${optional}: ${typeName}`;
    if (column.comment && this.options.generateComments !== false) {
      result += `; // ${column.comment}`;
    }
    result += "\n";
    return result;
  }
  /**
   * 映射 SQL 类型到 TypeScript 类型
   */
  mapSQLType(type, columnName) {
    switch (type.kind) {
      case "int":
      case "bigint":
        return "number";
      case "float":
      case "decimal":
        return "number";
      case "varchar":
      case "text":
        return "string";
      case "boolean":
        return "boolean";
      case "date":
      case "datetime":
        return "Date";
      case "json":
        return "unknown";
      case "enum":
        if (type.values && type.values.length > 0) {
          const enumValues = type.values.map((v) => `'${v}'`).join(" | ");
          if (columnName) {
            const fieldName = this.formatFieldName(columnName);
            return `${fieldName}: ${enumValues}`;
          }
          return enumValues;
        }
        return "string";
      default:
        return "string";
    }
  }
};

// src/generator/go-generator.ts
var GoGenerator = class extends BaseGenerator {
  constructor(options = { language: "go" }) {
    super();
    this.options = options;
  }
  /**
   * 生成整个数据库模式的类型定义
   */
  generateDatabase(database) {
    let result = `// Database: ${database.name}
`;
    result += `// Dialect: ${database.dialect}

`;
    if (this.options.namespace) {
      result += `package ${this.options.namespace}

`;
    }
    if (this.needsTimeImport(database)) {
      result += `import "time"

`;
    }
    for (const table of database.tables) {
      result += this.generateTable(table);
      result += "\n";
    }
    return result;
  }
  /**
   * 生成单个表的类型定义
   */
  generateTable(table) {
    let result = `// ${table.name} \u8868\u7ED3\u6784
`;
    result += `type ${this.formatTypeName(table.name)} struct {
`;
    for (const column of table.columns) {
      result += this.generateColumn(column);
    }
    result += "}\n";
    return result;
  }
  /**
   * 生成列的类型定义
   */
  generateColumn(column) {
    const fieldName = this.formatFieldName(column.name);
    const typeName = this.mapSQLType(column.type);
    const tag = this.generateGoTag(column);
    let result = `	${fieldName} ${typeName} ${tag}`;
    if (column.comment && this.options.generateComments !== false) {
      result += ` // ${column.comment}`;
    }
    result += "\n";
    return result;
  }
  /**
   * 映射 SQL 类型到 Go 类型
   */
  mapSQLType(type) {
    switch (type.kind) {
      case "int":
        return "int";
      case "bigint":
        return "int64";
      case "float":
        return "float64";
      case "decimal":
        return "float64";
      case "varchar":
      case "text":
        return "string";
      case "boolean":
        return "bool";
      case "date":
      case "datetime":
        return "time.Time";
      case "json":
        return "interface{}";
      case "enum":
        return "string";
      default:
        return "string";
    }
  }
  /**
   * 生成 Go 结构体标签
   */
  generateGoTag(column) {
    const tags = [];
    tags.push(`json:"${column.name}"`);
    tags.push(`db:"${column.name}"`);
    return `\`${tags.join(" ")}\``;
  }
};

// src/generator/gorm-generator.ts
var GormGenerator = class extends BaseGenerator {
  constructor(options = { language: "gorm" }) {
    super();
    this.options = options;
  }
  /**
   * 生成整个数据库模式的类型定义
   */
  generateDatabase(database) {
    let result = `// Database: ${database.name}
`;
    result += `// Dialect: ${database.dialect}

`;
    if (this.options.namespace) {
      result += `package ${this.options.namespace}

`;
    }
    if (this.needsTimeImport(database)) {
      result += `import "time"

`;
    }
    for (const table of database.tables) {
      result += this.generateTable(table);
      result += "\n";
    }
    return result;
  }
  /**
   * 生成单个表的类型定义
   */
  generateTable(table) {
    let result = `// ${table.name} \u8868\u7ED3\u6784
`;
    result += `type ${this.formatTypeName(table.name)} struct {
`;
    for (const column of table.columns) {
      result += this.generateColumn(column);
    }
    result += "}\n";
    return result;
  }
  /**
   * 生成列的类型定义
   */
  generateColumn(column) {
    const fieldName = this.formatFieldName(column.name);
    const typeName = this.mapSQLType(column.type);
    const tag = this.generateGormTag(column);
    let result = `	${fieldName} ${typeName} ${tag}`;
    if (column.comment && this.options.generateComments !== false) {
      result += ` // ${column.comment}`;
    }
    result += "\n";
    return result;
  }
  /**
   * 映射 SQL 类型到 GORM 类型
   */
  mapSQLType(type) {
    switch (type.kind) {
      case "int":
        return "int";
      case "bigint":
        return "int64";
      case "float":
        return "float64";
      case "decimal":
        return "float64";
      case "varchar":
      case "text":
        return "string";
      case "boolean":
        return "bool";
      case "date":
      case "datetime":
        return "time.Time";
      case "json":
        return "interface{}";
      case "enum":
        return "string";
      default:
        return "string";
    }
  }
  /**
   * 生成 GORM 结构体标签
   */
  generateGormTag(column) {
    const tags = [];
    tags.push(`column:${column.name}`);
    let typeTag = "type:";
    switch (column.type.kind) {
      case "int":
        typeTag += "int";
        if (column.type.length) {
          typeTag += `(${column.type.length})`;
        }
        break;
      case "bigint":
        typeTag += "bigint";
        if (column.type.length) {
          typeTag += `(${column.type.length})`;
        }
        break;
      case "float":
        typeTag += "float";
        if (column.type.precision) {
          typeTag += `(${column.type.precision}`;
          if (column.type.scale) {
            typeTag += `,${column.type.scale}`;
          }
          typeTag += ")";
        }
        break;
      case "decimal":
        typeTag += "decimal";
        if (column.type.precision) {
          typeTag += `(${column.type.precision}`;
          if (column.type.scale) {
            typeTag += `,${column.type.scale}`;
          }
          typeTag += ")";
        }
        break;
      case "varchar":
        typeTag += "varchar";
        if (column.type.length) {
          typeTag += `(${column.type.length})`;
        }
        break;
      case "text":
        typeTag += "text";
        break;
      case "boolean":
        typeTag += "bool";
        break;
      case "date":
        typeTag += "date";
        break;
      case "datetime":
        typeTag += "datetime";
        break;
      case "json":
        typeTag += "json";
        break;
      case "enum":
        typeTag += "enum";
        break;
      default:
        typeTag += "string";
    }
    tags.push(typeTag);
    if (column.primaryKey) {
      tags.push("primaryKey");
    }
    if (column.unique) {
      tags.push("unique");
    }
    if (!column.nullable) {
      tags.push("not null");
    }
    if (column.default) {
      tags.push(`default:${column.default}`);
    }
    if (column.generated) {
      tags.push("autoIncrement");
    }
    if (column.comment) {
      tags.push(`comment:${column.comment}`);
    }
    return `\`gorm:"${tags.join(";")}" json:"${column.name}"\``;
  }
};

// src/generator/xorm-generator.ts
var XormGenerator = class extends BaseGenerator {
  constructor(options = { language: "xorm" }) {
    super();
    this.options = options;
  }
  /**
   * 生成整个数据库模式的类型定义
   */
  generateDatabase(database) {
    let result = `// Database: ${database.name}
`;
    result += `// Dialect: ${database.dialect}

`;
    if (this.options.namespace) {
      result += `package ${this.options.namespace}

`;
    }
    if (this.needsTimeImport(database)) {
      result += `import "time"

`;
    }
    for (const table of database.tables) {
      result += this.generateTable(table);
      result += "\n";
    }
    return result;
  }
  /**
   * 生成单个表的类型定义
   */
  generateTable(table) {
    let result = `// ${table.name} \u8868\u7ED3\u6784
`;
    result += `type ${this.formatTypeName(table.name)} struct {
`;
    for (const column of table.columns) {
      result += this.generateColumn(column);
    }
    result += "}\n";
    return result;
  }
  /**
   * 生成列的类型定义
   */
  generateColumn(column) {
    const fieldName = this.formatFieldName(column.name);
    const typeName = this.mapSQLType(column.type);
    const tag = this.generateXormTag(column);
    let result = `	${fieldName} ${typeName} ${tag}`;
    if (column.comment && this.options.generateComments !== false) {
      result += ` // ${column.comment}`;
    }
    result += "\n";
    return result;
  }
  /**
   * 映射 SQL 类型到 XORM 类型
   */
  mapSQLType(type) {
    switch (type.kind) {
      case "int":
        return "int";
      case "bigint":
        return "int64";
      case "float":
        return "float64";
      case "decimal":
        return "float64";
      case "varchar":
      case "text":
        return "string";
      case "boolean":
        return "bool";
      case "date":
      case "datetime":
        return "time.Time";
      case "json":
        return "interface{}";
      case "enum":
        return "string";
      default:
        return "string";
    }
  }
  /**
   * 生成 XORM 结构体标签
   */
  generateXormTag(column) {
    const tags = [];
    tags.push(`${column.name}`);
    let typeTag = "";
    switch (column.type.kind) {
      case "int":
        typeTag = "int";
        if (column.type.length) {
          typeTag += `(${column.type.length})`;
        }
        break;
      case "bigint":
        typeTag = "bigint";
        if (column.type.length) {
          typeTag += `(${column.type.length})`;
        }
        break;
      case "float":
        typeTag = "float";
        if (column.type.precision) {
          typeTag += `(${column.type.precision}`;
          if (column.type.scale) {
            typeTag += `,${column.type.scale}`;
          }
          typeTag += ")";
        }
        break;
      case "decimal":
        typeTag = "decimal";
        if (column.type.precision) {
          typeTag += `(${column.type.precision}`;
          if (column.type.scale) {
            typeTag += `,${column.type.scale}`;
          }
          typeTag += ")";
        }
        break;
      case "varchar":
        typeTag = "varchar";
        if (column.type.length) {
          typeTag += `(${column.type.length})`;
        }
        break;
      case "text":
        typeTag = "text";
        break;
      case "boolean":
        typeTag = "bool";
        break;
      case "date":
        typeTag = "date";
        break;
      case "datetime":
        typeTag = "datetime";
        break;
      case "json":
        typeTag = "json";
        break;
      case "enum":
        typeTag = "enum";
        break;
      default:
        typeTag = "string";
    }
    if (typeTag) {
      tags.push(typeTag);
    }
    if (column.primaryKey) {
      tags.push("pk");
    }
    if (column.unique) {
      tags.push("unique");
    }
    if (!column.nullable) {
      tags.push("notnull");
    }
    if (column.default) {
      tags.push(`default(${column.default})`);
    }
    if (column.generated) {
      tags.push("autoincr");
    }
    if (column.comment) {
      tags.push(`comment(${column.comment})`);
    }
    return `\`xorm:"${tags.join(" ")}" json:"${column.name}"\``;
  }
};

// src/generator/index.ts
GeneratorFactory.register("typescript", TypeScriptGenerator);
GeneratorFactory.register("go", GoGenerator);
GeneratorFactory.register("gorm", GormGenerator);
GeneratorFactory.register("xorm", XormGenerator);

// src/generate.ts
function generateCode(sql, options) {
  const dbSchema = parseSQL(sql, {
    dialect: options.dialect || "mysql",
    dbName: options.dbName || "my_database"
  });
  const generatorOptions = {
    language: options.language,
    namespace: options.namespace,
    generateComments: true
  };
  const generator = GeneratorFactory.createGenerator(
    options.language,
    generatorOptions
  );
  return generator.generateDatabase(dbSchema);
}

// src/reader/index.ts
var fs = __toESM(require("fs/promises"));
async function readSQLFromFile(path) {
  if (!path) {
    throw new Error("File path is required");
  }
  try {
    return await fs.readFile(path, "utf-8");
  } catch (error) {
    if ((error == null ? void 0 : error.code) === "ENOENT") {
      throw new Error(`File not found: ${path}`);
    }
    throw error;
  }
}
async function readSQLFromString(sql) {
  if (!sql) {
    throw new Error("SQL string is required");
  }
  return sql;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BaseGenerator,
  GeneratorFactory,
  GoGenerator,
  GormGenerator,
  SQLParser,
  TypeScriptGenerator,
  XormGenerator,
  generateCode,
  parseSQL,
  readSQLFromFile,
  readSQLFromString
});
