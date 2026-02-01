import { GeneratorFactory } from '../src/generator/generator';
import { parseSQL } from '../src/sql-parser';

describe('Generator', () => {
  const sql = `
    CREATE TABLE users (
      id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
      name VARCHAR(255) NOT NULL COMMENT '用户名',
      email VARCHAR(255) UNIQUE NOT NULL COMMENT '用户邮箱',
      age INT COMMENT '用户年龄',
      is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
    ) COMMENT '用户表';
  `;

  const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });

  describe('GORM Generator', () => {
    it('should generate GORM code', async () => {
      const generator = await GeneratorFactory.createGenerator('gorm');
      const code = generator.generateDatabase(dbSchema);

      expect(code).toContain('type Users struct');
      expect(code).toContain('gorm:"');
      expect(code).toContain('comment:用户ID');
      expect(code).toContain('comment:用户名');
    });

    it('should generate GORM code with namespace', async () => {
      const generator = await GeneratorFactory.createGenerator('gorm', {
        language: 'gorm',
        namespace: 'models',
      });
      const code = generator.generateDatabase(dbSchema);

      expect(code).toContain('package models');
    });

    it('should generate single table', async () => {
      const generator = await GeneratorFactory.createGenerator('gorm');
      const code = generator.generateTable(dbSchema.tables[0]);

      expect(code).toContain('type Users struct');
      expect(code).toContain('Id int');
      expect(code).toContain('Name string');
    });
  });

  describe('TypeScript Generator', () => {
    it('should generate TypeScript code', async () => {
      const generator = await GeneratorFactory.createGenerator('typescript');
      const code = generator.generateDatabase(dbSchema);

      expect(code).toContain('interface Users');
      expect(code).toContain('id?: number');
      expect(code).toContain('name: string');
    });

    it('should generate single table', async () => {
      const generator = await GeneratorFactory.createGenerator('typescript');
      const code = generator.generateTable(dbSchema.tables[0]);

      expect(code).toContain('interface Users');
      expect(code).toContain('id?: number');
      expect(code).toContain('name: string');
    });
  });

  describe('XORM Generator', () => {
    it('should generate XORM code', async () => {
      const generator = await GeneratorFactory.createGenerator('xorm');
      const code = generator.generateDatabase(dbSchema);

      expect(code).toContain('type Users struct');
      expect(code).toContain('xorm:"');
      expect(code).toContain('comment(用户ID)');
    });

    it('should generate XORM code with namespace', async () => {
      const generator = await GeneratorFactory.createGenerator('xorm', {
        language: 'xorm',
        namespace: 'models',
      });
      const code = generator.generateDatabase(dbSchema);

      expect(code).toContain('package models');
    });

    it('should generate single table', async () => {
      const generator = await GeneratorFactory.createGenerator('xorm');
      const code = generator.generateTable(dbSchema.tables[0]);

      expect(code).toContain('type Users struct');
      expect(code).toContain('Id int');
      expect(code).toContain('Name string');
    });
  });

  describe('Go Generator', () => {
    it('should generate Go code', async () => {
      const generator = await GeneratorFactory.createGenerator('go');
      const code = generator.generateDatabase(dbSchema);

      expect(code).toContain('type Users struct');
      expect(code).toContain('json:"');
    });

    it('should generate Go code with namespace', async () => {
      const generator = await GeneratorFactory.createGenerator('go', {
        language: 'go',
        namespace: 'models',
      });
      const code = generator.generateDatabase(dbSchema);

      expect(code).toContain('package models');
    });

    it('should generate single table', async () => {
      const generator = await GeneratorFactory.createGenerator('go');
      const code = generator.generateTable(dbSchema.tables[0]);

      expect(code).toContain('type Users struct');
      expect(code).toContain('Id int');
      expect(code).toContain('Name string');
    });
  });

  describe('Generator Factory', () => {
    it('should throw error for unsupported language', async () => {
      await expect(
        GeneratorFactory.createGenerator('unsupported' as any)
      ).rejects.toThrow('Unsupported language: unsupported');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty database schema', async () => {
      const emptySchema = {
        name: 'test_db',
        dialect: 'mysql' as const,
        tables: [],
      };

      const generator = await GeneratorFactory.createGenerator('typescript');
      const code = generator.generateDatabase(emptySchema);

      expect(code).toBeDefined();
    });

    it('should handle table with no columns', async () => {
      const tableWithNoColumns = {
        name: 'empty_table',
        comment: 'Empty table',
        columns: [],
        primaryKeys: [],
        foreignKeys: [],
        indexes: [],
      };

      const generator = await GeneratorFactory.createGenerator('typescript');
      const code = generator.generateTable(tableWithNoColumns);

      expect(code).toBeDefined();
      expect(code).toContain('interface EmptyTable');
    });
  });

  describe('Enum Type Generation', () => {
    it('should generate correct code for enum types', async () => {
      const enumSql = `
        CREATE TABLE posts (
          id INT PRIMARY KEY,
          status ENUM('draft', 'published', 'archived') COMMENT 'Post status'
        );
      `;

      const enumSchema = parseSQL(enumSql, {
        dialect: 'mysql',
        dbName: 'test_db',
      });

      // Test TypeScript generator
      const tsGenerator = await GeneratorFactory.createGenerator('typescript');
      const tsCode = tsGenerator.generateDatabase(enumSchema);
      expect(tsCode).toContain("status?: status: 'draft' | 'published' | 'archived'");

      // Test GORM generator
      const gormGenerator = await GeneratorFactory.createGenerator('gorm');
      const gormCode = gormGenerator.generateDatabase(enumSchema);
      expect(gormCode).toContain('Status string');
    });
  });
});
