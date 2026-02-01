# sql-quicktype

将原始 SQL DDL 转换为结构化、类型化的数据库 Schema 中间表示（IR），可直接在代码中使用和分析。

## 功能特性

- **SQL 解析器**：支持解析 MySQL、PostgreSQL、SQLite、SQL Server 等多种数据库方言的 DDL 语句
- **多语言代码生成**：支持生成 TypeScript、Go、GORM、XORM 等多种语言的类型定义
- **灵活的数据源**：支持从 SQL 字符串或数据库连接生成代码
- **类型安全**：生成的代码包含完整的类型信息，提高代码安全性
- **注释保留**：自动保留表和列的注释信息
- **CLI 工具**：提供命令行工具，方便快速生成代码
- **自定义类型解析器**：支持注入自定义的类型解析器，灵活处理特殊的 SQL 类型
- **类型属性支持**：支持整数类型的显示宽度、浮点数类型的精度和小数位数
- **现代化 API**：使用异步 API，支持动态模块导入
- **自动命名空间**：Go/GORM/XORM 语言自动使用默认命名空间 `models`

## 安装

```bash
pnpm add @chihqiang/sql-quicktype
```

## 使用方法

### CLI 使用

#### 从 SQL 字符串生成代码

```bash
# 生成 GORM 代码（默认）
sql-quicktype sql -s "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));"

# 生成 TypeScript 代码
sql-quicktype sql -s "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));" -l typescript -o ./output

# 生成 XORM 代码
sql-quicktype sql -s "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));" -l xorm -o ./output

# 生成 Go 代码
sql-quicktype sql -s "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));" -l go -o ./output
```

#### 从数据库连接生成代码

```bash
# 从MySQL数据库生成代码（每个表生成单独的文件）
sql-quicktype db -h localhost -P 3306 -u user -p password -d dbname -l typescript -o ./output
```

#### 高级选项

```bash
# 指定数据库方言
sql-quicktype sql -s "CREATE TABLE users (id INT PRIMARY KEY);" -x postgres

# 指定命名空间/包名
sql-quicktype sql -s "CREATE TABLE users (id INT PRIMARY KEY);" -n models

# 为每个表生成单独的文件（仅 sql 命令支持）
sql-quicktype sql -s "CREATE TABLE users (id INT PRIMARY KEY);" -m multi -o ./output

# 指定数据库名称
sql-quicktype sql -s "CREATE TABLE users (id INT PRIMARY KEY);" --db-name my_database
```

### 编程 API 使用

#### 基本用法

```typescript
import { parseSQL, GeneratorFactory } from '@chihqiang/sql-quicktype';

// 解析 SQL
const sql = `
  CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) COMMENT '用户表';
`;

const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'my_database' });

// 生成 TypeScript 代码
const generator = await GeneratorFactory.createGenerator('typescript');
const code = generator.generateDatabase(dbSchema);
console.log(code);
```

#### 生成不同语言的代码

```typescript
// TypeScript
const tsGenerator = await GeneratorFactory.createGenerator('typescript');
const tsCode = tsGenerator.generateDatabase(dbSchema);

// Go
const goGenerator = await GeneratorFactory.createGenerator('go');
const goCode = goGenerator.generateDatabase(dbSchema);

// GORM
const gormGenerator = await GeneratorFactory.createGenerator('gorm');
const gormCode = gormGenerator.generateDatabase(dbSchema);

// XORM
const xormGenerator = await GeneratorFactory.createGenerator('xorm');
const xormCode = xormGenerator.generateDatabase(dbSchema);
```

#### 生成单个表的代码

```typescript
const generator = await GeneratorFactory.createGenerator('typescript');
const tableCode = generator.generateTable(dbSchema.tables[0]);
console.log(tableCode);
```

#### 使用自定义选项

```typescript
const generator = await GeneratorFactory.createGenerator('gorm', {
  language: 'gorm',
  namespace: 'models',
  generateComments: true
});

const code = generator.generateDatabase(dbSchema);
```

#### 使用自定义类型解析器

```typescript
import { parseSQL, TypeResolver } from '@chihqiang/sql-quicktype';

// 定义自定义类型解析器
class CustomTypeResolver implements TypeResolver {
  resolve(def: { dataType: string; length?: number | number[]; scale?: number; }) {
    const dt = def.dataType.toLowerCase();
    
    // 自定义处理 'decimal' 类型
    if (dt === 'decimal') {
      return {
        kind: 'decimal' as const,
        precision: 19,
        scale: 4
      };
    }
    
    // 对于其他类型，返回 null，让默认解析器处理
    return null;
  }
}

// 解析 SQL，传递自定义类型解析器
const dbSchema = parseSQL(sql, {
  dialect: 'mysql',
  dbName: 'test_db',
  typeResolvers: [new CustomTypeResolver()]
});
```

#### 从文件读取 SQL

```typescript
import { ReaderFactory } from '@chihqiang/sql-quicktype';

// 从文件读取
const fileReader = ReaderFactory.createReader({
  type: 'file',
  source: './schema.sql'
});
const sql = await fileReader.read();

// 从字符串读取
const stringReader = ReaderFactory.createReader({
  type: 'string',
  source: 'CREATE TABLE users (id INT PRIMARY KEY);'
});
const sql = await stringReader.read();
```

#### 使用 generateCode 函数

```typescript
import { generateCode } from '@chihqiang/sql-quicktype';

// 定义 SQL
const sql = `
  CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) COMMENT '用户表';
`;

// 生成 TypeScript 代码
const tsCode = await generateCode(sql, {
  language: 'typescript',
  namespace: 'models',
  dialect: 'mysql',
  dbName: 'my_database'
});
console.log(tsCode);

// 生成 GORM 代码
const gormCode = await generateCode(sql, {
  language: 'gorm',
  namespace: 'models',
  dialect: 'mysql',
  dbName: 'my_database'
});
console.log(gormCode);
```

## 支持的 SQL 类型

### 基本类型

| SQL 类型 | TypeScript | Go | 说明 |
|---------|-----------|-----|------|
| INT | number | int | 整数 |
| BIGINT | number | int64 | 大整数 |
| FLOAT | number | float32 | 浮点数 |
| DOUBLE | number | float64 | 双精度浮点数 |
| DECIMAL | number | float64 | 精确小数 |
| VARCHAR | string | string | 可变长度字符串 |
| TEXT | string | string | 文本 |
| LONGTEXT | string | string | 长文本 |
| BOOLEAN | boolean | bool | 布尔值 |
| DATE | Date | string | 日期 |
| DATETIME | Date | string | 日期时间 |
| TIMESTAMP | Date | string | 时间戳 |
| JSON | unknown | string | JSON 数据 |
| ENUM | string literal union | string | 枚举 |

### 特殊类型

- **BLOB**：映射为 text/string
- **TIME**：映射为 text/string
- **YEAR**：映射为 int
- **TINYINT**：长度为 1 时映射为 boolean，否则为 int
- **SMALLINT**：映射为 int
- **MEDIUMINT**：映射为 int

## CLI 选项

### sql 命令选项

从 SQL 字符串生成代码。

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| --sql | -s | SQL 字符串（必需） | - |
| --output | -o | 输出目录 | ./output |
| --language | -l | 目标语言（go/gorm/typescript/xorm） | gorm |
| --mode | -m | 输出模式（single/multi） | single |
| --namespace | -n | 命名空间/包名（go/gorm/xorm 默认：models） | - |
| --dialect | -x | SQL 方言（mysql/postgres/sqlite/sqlserver） | mysql |
| --db-name | - | 数据库名称 | my_database |

### db 命令选项

从数据库连接生成代码（每个表生成单独的文件）。

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| --host | -h | MySQL数据库主机 | 127.0.0.1 |
| --port | -P | MySQL数据库端口 | 3306 |
| --user | -u | MySQL数据库用户名 | root |
| --password | -p | MySQL数据库密码 | 空字符串 |
| --database | -d | MySQL数据库名称 | test |
| --output | -o | 输出目录 | ./output |
| --language | -l | 目标语言（go/gorm/typescript/xorm） | gorm |
| --namespace | -n | 命名空间/包名（go/gorm/xorm 默认：models） | - |
| --dialect | -x | SQL 方言（mysql/postgres/sqlite/sqlserver） | mysql |
| --db-name | - | 数据库名称 | my_database |

## API 文档

### parseSQL(sql, options)

将 SQL 字符串解析为数据库 Schema。

**参数：**

- `sql` (string): SQL 字符串
- `options` (SQLParserOptions): 解析器选项
  - `dialect` (string): 数据库方言（mysql、postgres、sqlite、sqlserver）
  - `dbName` (string): 数据库名称
  - `strictMode` (boolean): 是否启用严格模式（默认：false）
  - `ignoreComments` (boolean): 是否忽略注释（默认：false）
  - `parseForeignKeys` (boolean): 是否解析外键约束（默认：true）
  - `parseIndexes` (boolean): 是否解析索引（默认：true）
  - `typeResolvers` (TypeResolver[]): 自定义类型解析器数组

**返回值：**

- `DatabaseSchema`: 数据库 Schema 对象

### TypeResolver 接口

自定义类型解析器接口，用于扩展默认的类型解析逻辑。

**方法：**

- `resolve(def)`: 解析 SQL 类型定义为 SQLType
  - `def` (object): 列定义对象
    - `dataType` (string): SQL 数据类型
    - `length` (number | number[]): 长度信息
    - `scale` (number): 小数位数
    - `unsigned` (boolean): 是否无符号
    - `generated` (boolean): 是否为生成列
  - **返回值** (SQLType | null): 解析后的 SQLType 对象，返回 null 则使用默认解析器

### generateCode(sql, options)

从 SQL 模式生成指定语言的代码。

**参数：**

- `sql` (string): SQL 模式字符串
- `options` (object): 生成选项
  - `language` (string): 目标语言（typescript、go、gorm、xorm）
  - `namespace` (string): 命名空间/包名（可选）
  - `dialect` (string): SQL 方言（可选，默认：mysql）
  - `dbName` (string): 数据库名称（可选，默认：my_database）

**返回值：**

- `Promise<string>`: 生成的代码字符串

### GeneratorFactory.createGenerator(language, options)

创建语言生成器实例。

**参数：**

- `language` (string): 目标语言（typescript、go、gorm、xorm）
- `options` (Options): 生成器选项
  - `language` (string): 目标语言
  - `generateComments` (boolean): 是否生成注释
  - `namespace` (string): 命名空间/包名

**返回值：**

- `Promise<AGenerator>`: 生成器实例的 Promise

### ReaderFactory.createReader(options)

创建读取器实例。

**参数：**

- `options` (ReaderOptions): 读取器选项
  - `type` (string): 读取器类型（string、file）
  - `source` (string): 数据源

**返回值：**

- `Reader`: 读取器实例

## 示例

### 示例 1：生成 TypeScript 接口

输入 SQL：

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL COMMENT '用户名',
  email VARCHAR(255) UNIQUE COMMENT '用户邮箱',
  age INT COMMENT '用户年龄',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) COMMENT '用户表';
```

输出 TypeScript：

```typescript
// Database: my_database
// Dialect: mysql

// users 表结构
export interface Users {
  id?: number
  name: string; // 用户名
  email: string; // 用户邮箱
  age?: number; // 用户年龄
  isActive?: boolean; // 是否激活
  createdAt?: Date; // 创建时间
}
```

### 示例 2：生成 GORM 模型

输入 SQL：

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE
);
```

输出 GORM：

```go
package models

type Users struct {
  ID    int    `gorm:"column:id;primaryKey;autoIncrement"`
  Name  string `gorm:"column:name;not null"`
  Email string `gorm:"column:email;unique"`
}
```

### 示例 3：生成 XORM 模型

输入 SQL：

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL
);
```

输出 XORM：

```go
package models

type Users struct {
  ID   int    `xorm:"'id' pk autoincr"`
  Name string `xorm:"'name' notnull"`
}
```

## 贡献

欢迎提交 [Issue](https://github.com/chihqiang/sql-quicktype/issues) 和 [Pull Request](https://github.com/chihqiang/sql-quicktype/pulls)！

## 许可证

[Apache-2.0](https://github.com/chihqiang/sql-quicktype/blob/main/LICENSE)
