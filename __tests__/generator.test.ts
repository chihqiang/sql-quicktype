import { GeneratorFactory } from '../src/generator';
import { parseSQL } from '../src/sql-parser';

describe('Generator', () => {
  const sql = `
    CREATE TABLE users (
      id INT PRIMARY KEY AUTO_INCREMENT COMMENT 'user ID',
      name VARCHAR(255) NOT NULL COMMENT 'user name',
      email VARCHAR(255) UNIQUE NOT NULL COMMENT 'user email',
      age INT COMMENT 'user age',
      is_active BOOLEAN DEFAULT TRUE COMMENT 'is active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'created at'
    ) COMMENT 'users table';
  `;

  const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });

  describe('GORM Generator', () => {
    it('should generate GORM code', () => {
      const generator = GeneratorFactory.createGenerator('gorm');
      const code = generator.generateDatabase(dbSchema);

      expect(code).toContain('type Users struct');
      expect(code).toContain('gorm:"');
      expect(code).toContain('comment:user ID');
      expect(code).toContain('comment:user name');
    });

    it('should generate GORM code with namespace', () => {
      const generator = GeneratorFactory.createGenerator('gorm', {
        language: 'gorm',
        namespace: 'models',
      });
      const code = generator.generateDatabase(dbSchema);

      expect(code).toContain('package models');
    });

    it('should generate single table', () => {
      const generator = GeneratorFactory.createGenerator('gorm');
      const code = generator.generateTable(dbSchema.tables[0]);

      expect(code).toContain('type Users struct');
      expect(code).toContain('Id int');
      expect(code).toContain('Name string');
    });

    it('should include time import when datetime column exists', () => {
      const generator = GeneratorFactory.createGenerator('gorm');
      const code = generator.generateDatabase(dbSchema);
      expect(code).toContain('import "time"');
    });

    it('should handle composite primary keys', () => {
      const pkSql = `
        CREATE TABLE order_items (
          order_id INT,
          product_id INT,
          quantity INT,
          PRIMARY KEY (order_id, product_id)
        );
      `;
      const schema = parseSQL(pkSql, { dialect: 'mysql', dbName: 'test' });
      const generator = GeneratorFactory.createGenerator('gorm');
      const code = generator.generateTable(schema.tables[0]);
      expect(code).toContain('type OrderItems struct');
    });

    it('should handle unsigned columns', () => {
      const unsignedSql = `
        CREATE TABLE test (
          id INT PRIMARY KEY,
          age INT UNSIGNED
        );
      `;
      const schema = parseSQL(unsignedSql, { dialect: 'mysql', dbName: 'test' });
      const generator = GeneratorFactory.createGenerator('gorm');
      const code = generator.generateTable(schema.tables[0]);
      expect(code).toContain('type Test struct');
    });

    it('should generate without inline column comments when disabled', () => {
      const generator = GeneratorFactory.createGenerator('gorm', {
        language: 'gorm',
        generateComments: false,
      });
      const code = generator.generateDatabase(dbSchema);
      // Header comments still present, but column-level inline comments removed
      expect(code).not.toContain('// user ID');
      expect(code).not.toContain('// user name');
    });
  });

  describe('TypeScript Generator', () => {
    it('should generate TypeScript code', () => {
      const generator = GeneratorFactory.createGenerator('typescript');
      const code = generator.generateDatabase(dbSchema);

      expect(code).toContain('interface Users');
      expect(code).toContain('id?: number');
      expect(code).toContain('name: string');
    });

    it('should generate single table', () => {
      const generator = GeneratorFactory.createGenerator('typescript');
      const code = generator.generateTable(dbSchema.tables[0]);

      expect(code).toContain('interface Users');
      expect(code).toContain('id?: number');
      expect(code).toContain('name: string');
    });

    it('should map all SQL types correctly', () => {
      const typeSql = `
        CREATE TABLE all_types (
          id INT PRIMARY KEY,
          big_id BIGINT,
          salary FLOAT,
          price DECIMAL(10,2),
          name VARCHAR(255),
          bio TEXT,
          active BOOLEAN,
          birthday DATE,
          created_at DATETIME,
          metadata JSON,
          status ENUM('a','b')
        );
      `;
      const schema = parseSQL(typeSql, { dialect: 'mysql', dbName: 'test' });
      const generator = GeneratorFactory.createGenerator('typescript');
      const code = generator.generateDatabase(schema);

      expect(code).toContain('number');
      expect(code).toContain('string');
      expect(code).toContain('boolean');
      expect(code).toContain('Date');
      expect(code).toContain('unknown');
    });

    it('should handle nullable columns with optional marker', () => {
      const nullableSql = `
        CREATE TABLE test (
          id INT PRIMARY KEY,
          name VARCHAR(255),
          email VARCHAR(255) NOT NULL
        );
      `;
      const schema = parseSQL(nullableSql, { dialect: 'mysql', dbName: 'test' });
      const generator = GeneratorFactory.createGenerator('typescript');
      const code = generator.generateDatabase(schema);
      expect(code).toContain('name?');
    });
  });

  describe('XORM Generator', () => {
    it('should generate XORM code', () => {
      const generator = GeneratorFactory.createGenerator('xorm');
      const code = generator.generateDatabase(dbSchema);

      expect(code).toContain('type Users struct');
      expect(code).toContain('xorm:"');
      expect(code).toContain('comment(user ID)');
    });

    it('should generate XORM code with namespace', () => {
      const generator = GeneratorFactory.createGenerator('xorm', {
        language: 'xorm',
        namespace: 'models',
      });
      const code = generator.generateDatabase(dbSchema);

      expect(code).toContain('package models');
    });

    it('should generate single table', () => {
      const generator = GeneratorFactory.createGenerator('xorm');
      const code = generator.generateTable(dbSchema.tables[0]);

      expect(code).toContain('type Users struct');
      expect(code).toContain('Id int');
      expect(code).toContain('Name string');
    });

    it('should include time import when datetime column exists', () => {
      const generator = GeneratorFactory.createGenerator('xorm');
      const code = generator.generateDatabase(dbSchema);
      expect(code).toContain('import "time"');
    });

    it('should handle composite primary keys', () => {
      const pkSql = `
        CREATE TABLE order_items (
          order_id INT,
          product_id INT,
          PRIMARY KEY (order_id, product_id)
        );
      `;
      const schema = parseSQL(pkSql, { dialect: 'mysql', dbName: 'test' });
      const generator = GeneratorFactory.createGenerator('xorm');
      const code = generator.generateTable(schema.tables[0]);
      expect(code).toContain('type OrderItems struct');
    });
  });

  describe('Go Generator', () => {
    it('should generate Go code', () => {
      const generator = GeneratorFactory.createGenerator('go');
      const code = generator.generateDatabase(dbSchema);

      expect(code).toContain('type Users struct');
      expect(code).toContain('json:"');
    });

    it('should generate Go code with namespace', () => {
      const generator = GeneratorFactory.createGenerator('go', {
        language: 'go',
        namespace: 'models',
      });
      const code = generator.generateDatabase(dbSchema);

      expect(code).toContain('package models');
    });

    it('should generate single table', () => {
      const generator = GeneratorFactory.createGenerator('go');
      const code = generator.generateTable(dbSchema.tables[0]);

      expect(code).toContain('type Users struct');
      expect(code).toContain('Id int');
      expect(code).toContain('Name string');
    });

    it('should include time import when datetime column exists', () => {
      const generator = GeneratorFactory.createGenerator('go');
      const code = generator.generateDatabase(dbSchema);
      expect(code).toContain('import "time"');
    });

    it('should generate db tag alongside json tag', () => {
      const generator = GeneratorFactory.createGenerator('go');
      const code = generator.generateDatabase(dbSchema);
      expect(code).toContain('db:"');
      expect(code).toContain('json:"');
    });
  });

  describe('Generator Factory', () => {
    it('should throw error for unsupported language', () => {
      expect(() => {
        GeneratorFactory.createGenerator('unsupported' as any);
      }).toThrow('Unsupported language: unsupported');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty database schema', () => {
      const emptySchema = {
        name: 'test_db',
        dialect: 'mysql' as const,
        tables: [],
      };

      const generator = GeneratorFactory.createGenerator('typescript');
      const code = generator.generateDatabase(emptySchema);

      expect(code).toBeDefined();
    });

    it('should handle table with no columns', () => {
      const tableWithNoColumns = {
        name: 'empty_table',
        comment: 'Empty table',
        columns: [],
        primaryKeys: [],
        foreignKeys: [],
        indexes: [],
      };

      const generator = GeneratorFactory.createGenerator('typescript');
      const code = generator.generateTable(tableWithNoColumns);

      expect(code).toBeDefined();
      expect(code).toContain('interface EmptyTable');
    });

    it('should handle tables with backtick-quoted names', () => {
      const specialSql = 'CREATE TABLE `user data` (`full name` VARCHAR(255));';
      const schema = parseSQL(specialSql, { dialect: 'mysql', dbName: 'test' });
      const generator = GeneratorFactory.createGenerator('typescript');
      const code = generator.generateDatabase(schema);
      expect(code).toContain('interface User data');
    });

    it('should handle tables with foreign keys', () => {
      const fkSql = `
        CREATE TABLE orders (
          id INT PRIMARY KEY,
          user_id INT,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `;
      const schema = parseSQL(fkSql, { dialect: 'mysql', dbName: 'test' });
      const generator = GeneratorFactory.createGenerator('typescript');
      const code = generator.generateDatabase(schema);
      expect(code).toContain('interface Orders');
    });

    it('should handle multiple input tables', () => {
      const multiSql = `
        CREATE TABLE a (id INT PRIMARY KEY);
        CREATE TABLE b (id INT PRIMARY KEY);
      `;
      const schema = parseSQL(multiSql, { dialect: 'mysql', dbName: 'test' });
      expect(schema.tables).toHaveLength(2);
      const generator = GeneratorFactory.createGenerator('typescript');
      const code = generator.generateDatabase(schema);
      expect(code).toContain('interface A');
      expect(code).toContain('interface B');
    });
  });

  describe('Enum Type Generation', () => {
    it('should generate correct code for enum types', () => {
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

      const tsGenerator = GeneratorFactory.createGenerator('typescript');
      const tsCode = tsGenerator.generateDatabase(enumSchema);
      expect(tsCode).toContain("status?: status: 'draft' | 'published' | 'archived'");

      const gormGenerator = GeneratorFactory.createGenerator('gorm');
      const gormCode = gormGenerator.generateDatabase(enumSchema);
      expect(gormCode).toContain('Status string');
    });
  });

  describe('Type Mappings', () => {
    const typeSql = `
      CREATE TABLE mappings (
        id INT PRIMARY KEY,
        c_bigint BIGINT,
        c_float FLOAT,
        c_decimal DECIMAL(10,2),
        c_varchar VARCHAR(255),
        c_text TEXT,
        c_boolean BOOLEAN,
        c_date DATE,
        c_datetime DATETIME,
        c_json JSON,
        c_enum ENUM('x')
      );
    `;
    const schema = parseSQL(typeSql, { dialect: 'mysql', dbName: 'test' });

    it('should map types correctly for TypeScript', () => {
      const gen = GeneratorFactory.createGenerator('typescript');
      const code = gen.generateDatabase(schema);
      expect(code).toContain('cBigint?: number');
      expect(code).toContain('cVarchar?: string');
      expect(code).toContain('cBoolean?: boolean');
      expect(code).toContain('cDate?: Date');
      expect(code).toContain('cJson?: unknown');
    });

    it('should map types correctly for Go', () => {
      const gen = GeneratorFactory.createGenerator('go');
      const code = gen.generateDatabase(schema);
      expect(code).toContain('CBigint int64');
      expect(code).toContain('CVarchar string');
      expect(code).toContain('CBoolean bool');
      expect(code).toContain('CDate time.Time');
      expect(code).toContain('CJson interface{}');
    });

    it('should map types correctly for GORM', () => {
      const gen = GeneratorFactory.createGenerator('gorm');
      const code = gen.generateDatabase(schema);
      expect(code).toContain('CBigint int64');
      expect(code).toContain('CVarchar string');
      expect(code).toContain('CBoolean bool');
      expect(code).toContain('CDate time.Time');
    });

    it('should map types correctly for XORM', () => {
      const gen = GeneratorFactory.createGenerator('xorm');
      const code = gen.generateDatabase(schema);
      expect(code).toContain('CBigint int64');
      expect(code).toContain('CVarchar string');
      expect(code).toContain('CBoolean bool');
      expect(code).toContain('CDate time.Time');
    });
  });
});
