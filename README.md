# sql-quicktype

[![npm version](https://img.shields.io/npm/v/@chihqiang/sql-quicktype)](https://www.npmjs.com/package/@chihqiang/sql-quicktype)
[![license](https://img.shields.io/npm/l/@chihqiang/sql-quicktype)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)

将 SQL DDL 解析为结构化的数据库 Schema 中间表示（IR），并基于该 IR 生成 TypeScript、Go、GORM、XORM 类型定义。既可以在命令行中使用，也可以作为库集成到构建流程或 Web 应用中。

## 目录

- [功能特性](#功能特性)
- [环境要求](#环境要求)
- [安装](#安装)
- [快速开始](#快速开始)
- [CLI 使用](#cli-使用)
- [编程 API](#编程-api)
- [类型映射](#类型映射)
- [输出示例](#输出示例)
- [浏览器中使用](#浏览器中使用)
- [项目结构](#项目结构)
- [开发](#开发)
- [已知限制](#已知限制)
- [贡献](#贡献)
- [许可证](#许可证)

## 功能特性

- **SQL → IR**：把 `CREATE TABLE` 解析为 `DatabaseSchema`，包含表、列、主键、索引、外键、默认值和注释。
- **多语言代码生成**：一套 IR 可生成 TypeScript 接口、Go 结构体、GORM 模型和 XORM 模型。
- **CLI 工具**：支持直接传入 SQL 字符串，或连接 MySQL 数据库读取所有表结构。
- **类型安全**：生成结果保留可空性、枚举值、长度/精度等类型信息。
- **注释保留**：表注释和列注释会进入生成的代码与 ORM tag。
- **GORM 表名映射**：自动生成 `TableName()`，避免 GORM 默认复数化导致表名不匹配。
- **可扩展类型解析**：通过 `TypeResolver` 覆盖或扩展 SQL 类型到 IR 的映射。
- **同步生成 API**：`parseSQL`、`generateCode` 和所有生成器均为同步调用，无异步开销。
- **多运行时产物**：提供 ESM、CJS 以及可直接通过 `<script>` 引入的 IIFE 构建。

## 环境要求

- Node.js **20 或更高版本**（CLI 依赖 `commander@14`；开发与构建同样建议使用 Node 20+）。
- 使用编程 API 时，库产物的编译目标为 ES2018。

## 安装

```bash
# 作为项目依赖
npm install --save-dev @chihqiang/sql-quicktype

# 全局安装 CLI
npm install -g @chihqiang/sql-quicktype

# 或直接使用 npx
npx sql-quicktype --help
```

### 从 GitHub 仓库安装

如果不使用 npm registry，也可以直接从仓库安装。安装时会自动执行 `prepare` 脚本构建 `dist`：

```bash
# 作为项目依赖
npm install --save-dev git+https://github.com/chihqiang/sql-quicktype.git

# 全局安装 CLI
npm install -g git+https://github.com/chihqiang/sql-quicktype.git

# 指定分支、标签或提交
npm install --save-dev git+https://github.com/chihqiang/sql-quicktype.git#main
npm install --save-dev git+https://github.com/chihqiang/sql-quicktype.git#v0.0.9
```

也可以使用 GitHub 简写：

```bash
npm install --save-dev github:chihqiang/sql-quicktype
npm install -g github:chihqiang/sql-quicktype#main
```

> 从 Git 安装需要本地具备完整的构建环境（Node.js 20+ 与 npm）。如果安装较慢，通常是在拉取依赖并执行构建。

## 快速开始

### 命令行

```bash
# 默认生成 TypeScript，输出到 ./output/models.ts
sql-quicktype sql -s "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255) NOT NULL);"

# 为每个表生成单独文件，输出到 ./models 目录
sql-quicktype sql \
  -s "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255)); CREATE TABLE posts (id INT PRIMARY KEY, title VARCHAR(255));" \
  -l typescript \
  -m multi \
  -o ./models
```

### 编程 API

```typescript
import { generateCode } from '@chihqiang/sql-quicktype';

const sql = `
  CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT 'user ID',
    name VARCHAR(255) NOT NULL COMMENT 'user name',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'created at'
  );
`;

const code = generateCode(sql, {
  language: 'typescript',
  dialect: 'mysql',
  dbName: 'my_database',
});

console.log(code);
```

## CLI 使用

CLI 提供两个命令：

- `sql`：从 SQL 字符串生成代码。
- `db`：连接 MySQL 数据库，读取所有表并逐表生成代码。

### `sql` 命令

```bash
sql-quicktype sql -s "<SQL>" [options]
```

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--sql <sql>` | `-s` | 要解析的 SQL 字符串（必填） | - |
| `--mode <mode>` | `-m` | 输出模式：`single`（单文件）或 `multi`（每个表一个文件） | `single` |
| `--output <dir>` | `-o` | 输出目录，不存在时自动创建 | `./output` |
| `--language <lang>` | `-l` | 目标语言：`go`、`gorm`、`typescript`、`xorm` | `typescript` |
| `--namespace <name>` | `-n` | Go 系语言的包名；未指定时 `go`/`gorm`/`xorm` 使用 `models` | - |
| `--dialect <dialect>` | `-x` | 传给 `node-sql-parser` 的 SQL 方言 | `mysql` |
| `--db-name <name>` | - | 生成的代码中记录的数据库名称 | `my_database` |
| `--tinyint1-as-int` | - | 将 `tinyint(1)` 映射为 `int` 而不是 `bool` | `false` |

`--dialect` 的取值会直接传给底层解析器；MySQL 是当前主要支持并完整测试的方言，其他方言请参考[已知限制](#已知限制)。

### `db` 命令

```bash
sql-quicktype db -h <host> -P <port> -u <user> -p <password> -d <database> [options]
```

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--host <host>` | `-h` | MySQL 主机 | `127.0.0.1` |
| `--port <port>` | `-P` | MySQL 端口 | `3306` |
| `--user <user>` | `-u` | MySQL 用户名 | `root` |
| `--password <password>` | `-p` | MySQL 密码 | 空字符串 |
| `--database <database>` | `-d` | MySQL 数据库名 | `test` |
| `--output <dir>` | `-o` | 输出目录 | `./output` |
| `--language <lang>` | `-l` | 目标语言：`go`、`gorm`、`typescript`、`xorm` | `typescript` |
| `--namespace <name>` | `-n` | Go 系语言的包名 | `models`（Go 系语言） |
| `--dialect <dialect>` | `-x` | 传给 `node-sql-parser` 的 SQL 方言 | `mysql` |
| `--db-name <name>` | - | 生成代码中记录的数据库名称 | `my_database` |
| `--tinyint1-as-int` | - | 将 `tinyint(1)` 映射为 `int` 而不是 `bool` | `false` |

`db` 命令固定使用 **multi** 模式：每张表生成一个文件，并并发查询所有表的 `CREATE TABLE` 语句。命令结束后会打印成功与失败的表数量；单表失败不会中断其他表。

> 密码通过命令行参数传入时可能会出现在 shell 历史中，请在受控环境中使用。

### 输出规则

| 模式 | 语言 | 输出文件 |
|------|------|----------|
| `single` | TypeScript | `models.ts` |
| `single` | Go / GORM / XORM | `models.go` |
| `multi` | 任意语言 | `<表名小写>.ts` 或 `<表名小写>.go`，例如 `users.go` |

- `single` 模式会把所有表写入同一个文件。
- `multi` 模式下，Go 系语言每个文件都会带上 `package <namespace>`。
- TypeScript 生成器不使用 `namespace`。

### 常用示例

```bash
# 生成 TypeScript 单文件
sql-quicktype sql -s "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));" -l typescript -o ./types

# 生成 Go 结构体
sql-quicktype sql -s "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));" -l go -n models -o ./model

# 生成 GORM 模型，每个表一个文件
sql-quicktype sql -s "CREATE TABLE users (id INT PRIMARY KEY); CREATE TABLE posts (id INT PRIMARY KEY);" -l gorm -m multi -o ./models

# 生成 XORM 模型
sql-quicktype sql -s "CREATE TABLE users (id INT PRIMARY KEY);" -l xorm -o ./models

# 从 .sql 文件读取（CLI 暂不提供文件参数，使用 shell 展开）
sql-quicktype sql -s "$(cat schema.sql)" -l typescript -o ./types

# 从 MySQL 数据库生成
sql-quicktype db -h 127.0.0.1 -P 3306 -u root -p 'your-password' -d app_db -l gorm -o ./models
```

## 编程 API

### `parseSQL(sql, options)`

将 SQL 字符串解析为 `DatabaseSchema`。输入中的多个 `CREATE TABLE` 语句会解析为多张表；非 `CREATE TABLE` 语句会被忽略。

```typescript
import { parseSQL } from '@chihqiang/sql-quicktype';

const db = parseSQL(
  `CREATE TABLE users (
     id INT PRIMARY KEY AUTO_INCREMENT,
     name VARCHAR(255) NOT NULL
   );`,
  { dialect: 'mysql', dbName: 'my_database' }
);

console.log(db.name);                 // my_database
console.log(db.tables[0].name);       // users
console.log(db.tables[0].columns[0]); // { name: 'id', type: { kind: 'int' }, ... }
```

**选项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `dialect` | `string` | `mysql` | SQL 方言，传给 `node-sql-parser` |
| `dbName` | `string` | `db` | 写入 `DatabaseSchema.name` 的数据库名 |
| `strictMode` | `boolean` | `false` | 遇到未知 SQL 类型时抛出错误，而不是回退为 `text` |
| `parseForeignKeys` | `boolean` | `true` | 是否解析表级外键约束 |
| `parseIndexes` | `boolean` | `true` | 是否解析索引和唯一约束 |
| `tinyint1AsBool` | `boolean` | `true` | 是否将 `tinyint(1)` 映射为布尔值 |
| `typeResolvers` | `TypeResolver[]` | `[]` | 自定义类型解析器，优先于默认解析器执行 |

**返回值** `DatabaseSchema` 的主要字段：

```typescript
interface DatabaseSchema {
  name: string;
  dialect: string;
  tables: TableSchema[];
  tablesMap?: Record<string, TableSchema>;
}

interface TableSchema {
  name: string;
  comment?: string;
  primaryKeys?: string[];
  columns: ColumnSchema[];
  indexes?: TableIndex[];
  foreignKeys?: TableForeignKey[];
}

interface ColumnSchema {
  name: string;
  type: SQLType;       // { kind: 'int' | 'bigint' | 'varchar' | ... }
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  default?: string | null;
  comment?: string;
  unsigned?: boolean;
  generated?: boolean; // AUTO_INCREMENT 等生成列
}
```

解析失败时会抛出带有方言、SQL 长度和 SQL 前缀的 `Error`，便于定位输入问题。

### `generateCode(sql, options)`

一次性完成“解析 + 生成”，返回同步的代码字符串。

```typescript
import { generateCode } from '@chihqiang/sql-quicktype';

const code = generateCode(sql, {
  language: 'gorm',        // 'go' | 'typescript' | 'gorm' | 'xorm'
  namespace: 'models',     // Go 系语言的包名
  dialect: 'mysql',        // 默认 mysql
  dbName: 'my_database',   // 默认 my_database
  tinyint1AsInt: false,    // 默认 false
});
```

`generateCode` 总是生成注释。若需要关闭注释，请使用 `GeneratorFactory` 并设置 `generateComments: false`。

### `GeneratorFactory`

当需要复用 IR、只生成单表，或调整生成器选项时，可以直接创建生成器：

```typescript
import { parseSQL, GeneratorFactory } from '@chihqiang/sql-quicktype';

const db = parseSQL(sql, { dialect: 'mysql', dbName: 'my_database' });

const generator = GeneratorFactory.createGenerator('gorm', {
  language: 'gorm',
  namespace: 'models',
  generateComments: true,
});

const allCode = generator.generateDatabase(db);
const tableCode = generator.generateTable(db.tables[0]);
const tableFile = generator.generateTableFile(db.tables[0], 'models');
```

可用的生成器方法：

| 方法 | 说明 |
|------|------|
| `generateDatabase(db)` | 生成整个数据库的代码 |
| `generateTable(table)` | 生成单张表的类型定义 |
| `generateTableFile(table, namespace?)` | 生成带 `package` 和 `import` 的单表文件内容 |
| `generateColumn(column)` | 生成单个字段定义 |
| `mapSQLType(type)` | 映射 IR 类型到目标语言类型 |

语言不在 `go`、`gorm`、`typescript`、`xorm` 中时会抛出 `Unsupported language: <lang>`。

### 自定义类型解析器

`TypeResolver` 会按数组顺序优先执行；返回 `null` 时回退到下一个解析器，最后使用内置解析器。

```typescript
import { parseSQL, type TypeResolver } from '@chihqiang/sql-quicktype';

const decimalAsMoney: TypeResolver = {
  resolve(def) {
    if (def.dataType?.toLowerCase() !== 'decimal') {
      return null;
    }

    return {
      kind: 'decimal',
      precision: 19,
      scale: 4,
    };
  },
};

const db = parseSQL(sql, {
  dialect: 'mysql',
  dbName: 'shop',
  typeResolvers: [decimalAsMoney],
});
```

结合 `strictMode: true` 可以确保所有未知类型都被显式处理，而不是静默回退为 `text`。

### 从文件读取 SQL

库不再提供文件读取辅助函数，直接使用 Node.js 文件 API 即可：

```typescript
import { readFileSync } from 'node:fs';
import { generateCode } from '@chihqiang/sql-quicktype';

const sql = readFileSync('./schema.sql', 'utf-8');
const code = generateCode(sql, { language: 'typescript' });
```

## 类型映射

解析器把 SQL 类型归一化为 `SQLType`，再由各生成器映射为目标语言类型：

| SQL 类型 | IR `kind` | TypeScript | Go / GORM / XORM |
|----------|-----------|------------|------------------|
| `INT`、`INTEGER`、`SMALLINT`、`MEDIUMINT`、`YEAR` | `int` | `number` | `int` |
| `BIGINT` | `bigint` | `number` | `int64` |
| `FLOAT`、`DOUBLE` | `float` | `number` | `float64` |
| `DECIMAL` | `decimal` | `number` | `float64` |
| `VARCHAR` | `varchar` | `string` | `string` |
| `TEXT`、`LONGTEXT`、`BLOB`、`TIME` | `text` | `string` | `string` |
| `BOOLEAN` | `boolean` | `boolean` | `bool` |
| `TINYINT(1)`（默认） | `boolean` | `boolean` | `bool` |
| 其他 `TINYINT` / `--tinyint1-as-int` | `int` | `number` | `int` |
| `DATE` | `date` | `Date` | `time.Time` |
| `DATETIME`、`TIMESTAMP` | `datetime` | `Date` | `time.Time` |
| `JSON` | `json` | `unknown` | `interface{}` |
| `ENUM('a','b')` | `enum` | 枚举值字面量联合类型 | `string` |
| 未知类型 | `text`（`strictMode` 下抛错） | `string` | `string` |

其他约定：

- **可空列**：TypeScript 中带 `?`；Go 系类型本身不区分可空，GORM/XORM 通过 `not null` tag 表达。
- **命名**：表名转为 PascalCase（`users` → `Users`，不做单数化）；字段名转为 PascalCase（Go 系）或 camelCase（TypeScript）。
- **默认值**：字符串、日期和枚举默认值会在 ORM tag 中加引号；`CURRENT_TIMESTAMP`、`NOW()` 等函数表达式保持原样。
- **索引与外键**：会保留在 `TableSchema.indexes` / `foreignKeys` 中，当前不体现在生成的模型代码里。
- **日期列**：Go 系生成器会自动添加 `import "time"`。

## 输出示例

输入：

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT 'user ID',
  name VARCHAR(255) NOT NULL COMMENT 'user name',
  email VARCHAR(255) UNIQUE NOT NULL COMMENT 'user email',
  age INT COMMENT 'user age',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'is active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'created at'
) COMMENT 'users table';
```

> 下面各代码块中，Go 示例已按 `gofmt` 对齐；未格式化时的原始输出使用单个 tab 缩进。

### TypeScript

```typescript
// Database: my_database
// Dialect: mysql

// users table structure
export interface Users {
	id?: number; // user ID
	name: string; // user name
	email: string; // user email
	age?: number; // user age
	isActive?: boolean; // is active
	createdAt?: Date; // created at
}
```

### GORM

```go
// Database: my_database
// Dialect: mysql

package models

import "time"

// users table structure
type Users struct {
	Id        int       `gorm:"column:id;type:int;primaryKey;comment:user ID" json:"id"` // user ID
	Name      string    `gorm:"column:name;type:varchar(255);not null;comment:user name" json:"name"` // user name
	Email     string    `gorm:"column:email;type:varchar(255);unique;not null;comment:user email" json:"email"` // user email
	Age       int       `gorm:"column:age;type:int;comment:user age" json:"age"` // user age
	IsActive  bool      `gorm:"column:is_active;type:bool;default:true;comment:is active" json:"is_active"` // is active
	CreatedAt time.Time `gorm:"column:created_at;type:datetime;default:CURRENT_TIMESTAMP;comment:created at" json:"created_at"` // created at
}

func (Users) TableName() string {
	return "users"
}
```

### XORM

```go
package models

import "time"

// users table structure
type Users struct {
	Id        int       `xorm:"id int pk comment(user ID)" json:"id"` // user ID
	Name      string    `xorm:"name varchar(255) notnull comment(user name)" json:"name"` // user name
	Email     string    `xorm:"email varchar(255) unique notnull comment(user email)" json:"email"` // user email
	Age       int       `xorm:"age int comment(user age)" json:"age"` // user age
	IsActive  bool      `xorm:"is_active bool default(true) comment(is active)" json:"is_active"` // is active
	CreatedAt time.Time `xorm:"created_at datetime default(CURRENT_TIMESTAMP) comment(created at)" json:"created_at"` // created at
}
```

### Go

```go
package models

import "time"

// users table structure
type Users struct {
	Id        int       `json:"id" db:"id"` // user ID
	Name      string    `json:"name" db:"name"` // user name
	Email     string    `json:"email" db:"email"` // user email
	Age       int       `json:"age" db:"age"` // user age
	IsActive  bool      `json:"is_active" db:"is_active"` // is active
	CreatedAt time.Time `json:"created_at" db:"created_at"` // created at
}
```

## 浏览器中使用

构建产物 `dist/index.global.js` 会暴露全局对象 `sqlQuicktype`：

```html
<script src="https://cdn.jsdelivr.net/npm/@chihqiang/sql-quicktype@latest/dist/index.global.js"></script>
<script>
  const code = sqlQuicktype.generateCode(
    'CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));',
    { language: 'typescript' }
  );

  console.log(code);
</script>
```

仓库根目录的 [index.html](./index.html) 是一个可直接运行的在线 Playground：

```bash
npm run build
npx serve .
# 打开 http://localhost:3000
```

## 项目结构

```text
.
├── src/
│   ├── cli.ts                  # CLI 入口，注册 sql / db 命令
│   ├── cli/
│   │   ├── sql-command.ts      # 从 SQL 字符串生成
│   │   ├── db-command.ts       # 从 MySQL 数据库生成
│   │   └── output.ts           # 公共选项与文件输出逻辑
│   ├── generate.ts             # generateCode 高层 API
│   ├── index.ts                # 包入口
│   ├── schema.ts               # DatabaseSchema / ColumnSchema / SQLType 等 IR 定义
│   ├── sql-parser.ts           # DDL → IR 解析器
│   ├── constants.ts            # 支持的语言与默认值
│   └── generator/
│       ├── base.ts             # 生成器基类与工厂
│       ├── typescript-generator.ts
│       ├── go-generator.ts
│       ├── gorm-generator.ts
│       └── xorm-generator.ts
├── __tests__/                  # Vitest 测试
├── index.html                  # 浏览器 Playground
└── vite.config.ts              # 库、CLI、IIFE 三种构建配置
```

## 开发

```bash
# 安装依赖
npm install

# 监听构建
npm run dev

# 完整构建：库（ESM/CJS/d.ts）+ CLI + IIFE
npm run build

# 单独构建
npm run build:lib
npm run build:cli
npm run build:iife

# 测试
npm test
npm run test:watch
npm run test:coverage

# 类型检查与格式化
npm run typecheck
npm run format
npm run format:check
```

构建产物说明：

| 文件 | 用途 |
|------|------|
| `dist/index.mjs` | ESM 入口 |
| `dist/index.js` | CommonJS 入口 |
| `dist/index.d.ts` | 类型声明 |
| `dist/cli.js` | CLI 可执行文件（`sql-quicktype`） |
| `dist/index.global.js` | 浏览器 IIFE 产物（全局变量 `sqlQuicktype`） |

## 已知限制

- 只解析 `CREATE TABLE` 语句，`ALTER TABLE`、视图、存储过程等不会被处理。
- **MySQL 是主要支持目标**。`--dialect`/`dialect` 会直接传给 `node-sql-parser`；SQLite 做过基础验证，其他方言（例如 `postgresql`、`transactsql`）的 AST 结构存在差异，字段名与类型映射可能不完整，使用前请检查生成结果。
- 表名和字段名只做大小写格式转换，不做单数化或复数化。
- 未知类型默认回退为 `text`/`string`；需要严格校验时请启用 `strictMode`。
- `db` 命令目前只支持 MySQL。
- CLI 没有直接接收文件路径的参数，可通过 `-s "$(cat schema.sql)"` 传入文件内容。
- 索引与外键会保留在 IR 中，但不会生成到 TypeScript/Go 结构体里。
- TypeScript 生成器对 `ENUM` 字段的输出目前会在字段名前多拼接一次字段名，生成后请检查并按需修正。

## 贡献

欢迎提交 [Issue](https://github.com/chihqiang/sql-quicktype/issues) 和 [Pull Request](https://github.com/chihqiang/sql-quicktype/pulls)。

提交前请至少运行：

```bash
npm run typecheck && npm test
```

## 许可证

[Apache-2.0](./LICENSE)
