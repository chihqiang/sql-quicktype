# 测试目录

本目录包含 sql-quicktype 项目的所有测试用例。

## 测试框架

本项目使用 [Vitest](https://vitest.dev/) 作为测试框架，配合 Vite 进行测试。

## 测试文件

- `sql-parser.test.ts` - SQL 解析器的测试用例
- `generator.test.ts` - 代码生成器的测试用例
- `cli.test.ts` - CLI 文件输出功能的测试用例
- `integration.test.ts` - 端到端集成测试用例

## 运行测试

### 运行所有测试

```bash
npm test
```

### 运行测试并监听文件变化

```bash
npm run test:watch
```

### 运行测试并生成覆盖率报告

```bash
npm run test:coverage
```

## 测试覆盖率

当前测试覆盖率约为 70%，主要覆盖了：

- SQL 解析器的核心功能
- 各种代码生成器（GORM、TypeScript、XORM、Go）
- 基本的类型映射和约束处理

## 测试用例说明

### SQL Parser 测试

测试 SQL 解析器的各种功能：

- 简单的 CREATE TABLE 语句解析
- 表注释解析
- 字段注释解析
- 字段类型解析（INT、VARCHAR、TEXT、DECIMAL、BOOLEAN、DATETIME、ENUM）
- 字段约束解析（PRIMARY KEY、UNIQUE、NOT NULL、AUTO_INCREMENT）
- 默认值解析（包括函数表达式如 CURRENT_TIMESTAMP）
- 多表解析
- 主键解析

### Generator 测试

测试各种代码生成器的功能：

- **GORM Generator**: 生成 GORM 结构体代码
- **TypeScript Generator**: 生成 TypeScript 接口代码
- **XORM Generator**: 生成 XORM 结构体代码
- **Go Generator**: 生成 Go 结构体代码
- **Generator Factory**: 测试工厂类的错误处理

## 添加新测试

要添加新的测试用例，请遵循以下步骤：

1. 在相应的测试文件中添加新的 `it()` 或 `describe()` 块
2. 使用 `expect()` 断言来验证预期结果
3. 确保测试用例清晰、独立且具有代表性

### 示例

```typescript
it('should parse a new feature', () => {
  const sql = `
    CREATE TABLE test (
      id INT PRIMARY KEY
    );
  `;

  const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });

  expect(dbSchema.tables[0].name).toBe('test');
});
```

## 持续集成

测试会在以下情况自动运行：

- 提交代码前（建议）
- Pull Request 时
- 持续集成流程中

## 故障排除

如果测试失败：

1. 确保已安装所有依赖：`npm install`
2. 确保项目已构建：`npm run build`
3. 检查测试用例的预期值是否与实际实现一致
4. 查看详细的错误信息进行调试
