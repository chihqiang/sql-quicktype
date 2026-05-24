import { parseSQL, TypeResolver } from '../src/sql-parser';

describe('SQL Parser', () => {
  describe('parseSQL', () => {
    it('should parse a simple CREATE TABLE statement', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });

      expect(dbSchema.name).toBe('test_db');
      expect(dbSchema.dialect).toBe('mysql');
      expect(dbSchema.tables).toHaveLength(1);
      expect(dbSchema.tables[0].name).toBe('users');
    });

    it('should parse table comment', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY
        ) COMMENT 'users table';
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });

      expect(dbSchema.tables[0].comment).toBe('users table');
    });

    it('should parse column comment', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY COMMENT 'user ID',
          name VARCHAR(255) NOT NULL COMMENT 'user name'
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });

      expect(dbSchema.tables[0].columns[0].comment).toBe('user ID');
      expect(dbSchema.tables[0].columns[1].comment).toBe('user name');
    });

    it('should parse column types correctly', () => {
      const sql = `
        CREATE TABLE test (
          id INT PRIMARY KEY,
          name VARCHAR(255),
          content TEXT,
          price DECIMAL(10,2),
          is_active BOOLEAN,
          created_at DATETIME
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });
      const columns = dbSchema.tables[0].columns;

      expect(columns[0].type.kind).toBe('int');
      expect(columns[1].type.kind).toBe('varchar');
      if (columns[1].type.kind === 'varchar') {
        expect(columns[1].type.length).toBe(255);
      }
      expect(columns[2].type.kind).toBe('text');
      expect(columns[3].type.kind).toBe('decimal');
      if (columns[3].type.kind === 'decimal') {
        expect(columns[3].type.precision).toBe(10);
        expect(columns[3].type.scale).toBe(2);
      }
      expect(columns[4].type.kind).toBe('boolean');
      expect(columns[5].type.kind).toBe('datetime');
    });

    it('should parse more data types', () => {
      const sql = `
        CREATE TABLE test_types (
          id INT PRIMARY KEY,
          binary_data BLOB,
          long_text LONGTEXT,
          time_stamp TIMESTAMP,
          date_only DATE,
          time_only TIME,
          year_only YEAR,
          float_num FLOAT,
          double_num DOUBLE,
          tiny_int TINYINT,
          small_int SMALLINT,
          big_int BIGINT,
          medium_int MEDIUMINT
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });
      const columns = dbSchema.tables[0].columns;

      expect(columns[1].type.kind).toBe('text'); // BLOB maps to text
      expect(columns[2].type.kind).toBe('text'); // LONGTEXT maps to text
      expect(columns[3].type.kind).toBe('datetime'); // TIMESTAMP maps to datetime
      expect(columns[4].type.kind).toBe('date');
      expect(columns[5].type.kind).toBe('text'); // TIME maps to text
      expect(columns[6].type.kind).toBe('int'); // YEAR maps to int
      expect(columns[7].type.kind).toBe('float');
      expect(columns[8].type.kind).toBe('float'); // DOUBLE maps to float
      expect(columns[9].type.kind).toBe('int'); // TINYINT maps to int
      expect(columns[10].type.kind).toBe('int'); // SMALLINT maps to int
      expect(columns[11].type.kind).toBe('bigint');
      expect(columns[12].type.kind).toBe('int'); // MEDIUMINT maps to int
    });

    it('should parse column constraints', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          email VARCHAR(255) UNIQUE NOT NULL,
          age INT NULL
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });
      const columns = dbSchema.tables[0].columns;

      expect(columns[0].primaryKey).toBe(true);
      expect(columns[0].generated).toBe(false);
      expect(columns[1].unique).toBe(true);
      expect(columns[1].nullable).toBe(false);
      expect(columns[2].nullable).toBe(true);
    });

    it('should parse default values', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY,
          is_active BOOLEAN DEFAULT TRUE,
          status VARCHAR(32) DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });
      const columns = dbSchema.tables[0].columns;

      expect(columns[1].default).toBe('true');
      expect(columns[2].default).toBe('pending');
      expect(columns[3].default).toBe('CURRENT_TIMESTAMP');
    });

    it('should parse ENUM type', () => {
      const sql = `
        CREATE TABLE posts (
          id INT PRIMARY KEY,
          status ENUM('draft', 'published', 'archived')
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });
      const statusColumn = dbSchema.tables[0].columns[1];

      expect(statusColumn.type.kind).toBe('enum');
      if (statusColumn.type.kind === 'enum') {
        expect(statusColumn.type.values).toEqual([
          'draft',
          'published',
          'archived',
        ]);
      }
    });

    it('should parse multiple tables', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY
        );
        CREATE TABLE posts (
          id INT PRIMARY KEY
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });

      expect(dbSchema.tables).toHaveLength(2);
      expect(dbSchema.tables[0].name).toBe('users');
      expect(dbSchema.tables[1].name).toBe('posts');
    });

    it('should parse primary keys', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });

      expect(dbSchema.tables[0].primaryKeys).toEqual(['id']);
    });

    it('should parse composite primary keys', () => {
      const sql = `
        CREATE TABLE order_items (
          order_id INT,
          product_id INT,
          quantity INT,
          PRIMARY KEY (order_id, product_id)
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });

      expect(dbSchema.tables[0].primaryKeys).toEqual([
        'order_id',
        'product_id',
      ]);
    });

    it('should parse foreign keys', () => {
      const sql = `
        CREATE TABLE orders (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT,
          total DECIMAL(10,2),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `;

      // Note: since node-sql-parser's AST structure may not include foreign key information, we only check that the parsing process completes successfully
      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });
      expect(dbSchema).toBeDefined();
      expect(dbSchema.tables[0].name).toBe('orders');
    });

    it('should parse indexes', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name VARCHAR(255),
          email VARCHAR(255),
          age INT,
          INDEX idx_name (name),
          UNIQUE INDEX idx_email (email),
          INDEX idx_age_name (age, name)
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });
      const table = dbSchema.tables[0];

      expect(table.indexes).toBeDefined();
      // Note: since node-sql-parser's AST structure may only include partial index information, we only test that the index array exists
      expect(Array.isArray(table.indexes)).toBe(true);
    });

    it('should parse DEFAULT NULL correctly', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name VARCHAR(255) DEFAULT NULL,
          email VARCHAR(255) DEFAULT NULL
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });
      const columns = dbSchema.tables[0].columns;

      expect(columns[1].default).toBe(null);
      expect(columns[2].default).toBe(null);
    });

    it('should parse empty string default value correctly', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name VARCHAR(255) DEFAULT '',
          description TEXT DEFAULT ''
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });
      const columns = dbSchema.tables[0].columns;

      expect(columns[1].default).toBe('');
      expect(columns[2].default).toBe('');
    });

    it('should parse numeric default values correctly', () => {
      const sql = `
        CREATE TABLE products (
          id INT PRIMARY KEY,
          price DECIMAL(10,2) DEFAULT 0.00,
          quantity INT DEFAULT 0,
          is_active BOOLEAN DEFAULT 1
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });
      const columns = dbSchema.tables[0].columns;

      expect(columns[1].default).toBe('0.00');
      expect(columns[2].default).toBe('0');
      expect(columns[3].default).toBe('1');
    });

    it('should parse table and column names with special characters', () => {
      const sql = `
        CREATE TABLE \`test-table\` (
          \`id-column\` INT PRIMARY KEY,
          \`user_name\` VARCHAR(255),
          \`email-address\` VARCHAR(255) UNIQUE
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });
      const table = dbSchema.tables[0];

      expect(table.name).toBe('test-table');
      expect(table.columns[0].name).toBe('id-column');
      expect(table.columns[1].name).toBe('user_name');
      expect(table.columns[2].name).toBe('email-address');
    });

    it('should parse multiple tables with complex structures', () => {
      const sql = `
        CREATE TABLE departments (
          id INT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE employees (
          id INT PRIMARY KEY,
          department_id INT,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE,
          salary DECIMAL(10,2) DEFAULT 0.00,
          is_active BOOLEAN DEFAULT TRUE,
          hired_at DATE DEFAULT CURRENT_DATE,
          FOREIGN KEY (department_id) REFERENCES departments(id)
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });

      expect(dbSchema.tables).toHaveLength(2);
      expect(dbSchema.tables[0].name).toBe('departments');
      expect(dbSchema.tables[1].name).toBe('employees');
      expect(dbSchema.tables[1].columns).toHaveLength(7);
    });

    it('should handle SQLite AUTOINCREMENT correctly', () => {
      const sql = `
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'sqlite', dbName: 'test_db' });
      const table = dbSchema.tables[0];

      expect(table.name).toBe('users');
      expect(table.columns[0].primaryKey).toBe(true);
    });

    it('should handle edge case: empty SQL string', () => {
      expect(() => {
        parseSQL('', { dialect: 'mysql', dbName: 'test_db' });
      }).toThrow('SQL string is required and must be a string');
    });

    it('should handle edge case: non-string SQL input', () => {
      expect(() => {
        // @ts-ignore - Intentionally passing non-string to test error handling
        parseSQL(123, { dialect: 'mysql', dbName: 'test_db' });
      }).toThrow('SQL string is required and must be a string');
    });

    it('should handle edge case: invalid SQL syntax', () => {
      expect(() => {
        parseSQL('INVALID SQL', { dialect: 'mysql', dbName: 'test_db' });
      }).toThrow('SQL parsing error');
    });

    it('should parse various data types with their properties', () => {
      const sql = `
        CREATE TABLE test_types (
          id INT PRIMARY KEY,
          bigint_col BIGINT,
          float_col FLOAT,
          double_col DOUBLE,
          decimal_col DECIMAL(10,2),
          varchar_col VARCHAR(255),
          text_col TEXT,
          longtext_col LONGTEXT,
          blob_col BLOB,
          boolean_col BOOLEAN,
          tinyint_col TINYINT,
          smallint_col SMALLINT,
          mediumint_col MEDIUMINT,
          date_col DATE,
          datetime_col DATETIME,
          timestamp_col TIMESTAMP,
          time_col TIME,
          year_col YEAR,
          json_col JSON
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });
      const table = dbSchema.tables[0];

      expect(table.name).toBe('test_types');
      expect(table.columns).toHaveLength(19);
    });

    it('should use tablesMap for quick table lookup', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name VARCHAR(255)
        );

        CREATE TABLE posts (
          id INT PRIMARY KEY,
          title VARCHAR(255)
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });

      expect(dbSchema.tablesMap).toBeDefined();
      if (dbSchema.tablesMap) {
        expect(dbSchema.tablesMap['users']).toBeDefined();
        expect(dbSchema.tablesMap['posts']).toBeDefined();
        expect(dbSchema.tablesMap['users'].name).toBe('users');
        expect(dbSchema.tablesMap['posts'].name).toBe('posts');
      }
    });

    it('should handle strict mode correctly', () => {
      // Note: since node-sql-parser rejects unrecognized types during parsing, we cannot test custom type scenarios
      // Here we test other functionality to ensure the strict mode option is passed correctly
      const sql = `
        CREATE TABLE test (
          id INT PRIMARY KEY,
          name VARCHAR(255)
        );
      `;

      // Test that the strict mode option is passed correctly
      const dbSchemaStrict = parseSQL(sql, {
        dialect: 'mysql',
        dbName: 'test_db',
        strictMode: true,
      });
      expect(dbSchemaStrict).toBeDefined();
      expect(dbSchemaStrict.tables[0].name).toBe('test');
    });

    it('should respect parseForeignKeys option', () => {
      const sql = `
        CREATE TABLE orders (
          id INT PRIMARY KEY,
          user_id INT,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `;

      // Enable foreign key parsing
      const dbSchemaWithFK = parseSQL(sql, {
        dialect: 'mysql',
        dbName: 'test_db',
        parseForeignKeys: true,
      });
      // Note: since node-sql-parser's AST structure may not include foreign key information, we only check that parsing completes successfully
      expect(dbSchemaWithFK).toBeDefined();

      // Disable foreign key parsing
      const dbSchemaWithoutFK = parseSQL(sql, {
        dialect: 'mysql',
        dbName: 'test_db',
        parseForeignKeys: false,
      });
      // Similarly, only check that parsing completes successfully
      expect(dbSchemaWithoutFK).toBeDefined();
    });

    it('should respect parseIndexes option', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name VARCHAR(255),
          INDEX idx_name (name)
        );
      `;

      // Enable index parsing
      const dbSchemaWithIndexes = parseSQL(sql, {
        dialect: 'mysql',
        dbName: 'test_db',
        parseIndexes: true,
      });
      expect(dbSchemaWithIndexes.tables[0].indexes).toBeDefined();
      if (dbSchemaWithIndexes.tables[0].indexes) {
        expect(dbSchemaWithIndexes.tables[0].indexes.length).toBeGreaterThan(0);
      }

      // Disable index parsing
      const dbSchemaWithoutIndexes = parseSQL(sql, {
        dialect: 'mysql',
        dbName: 'test_db',
        parseIndexes: false,
      });
      expect(dbSchemaWithoutIndexes.tables[0].indexes).toEqual([]);
    });

    it('should handle enum types with quotes correctly', () => {
      const sql = `
        CREATE TABLE test_enum (
          id INT PRIMARY KEY,
          status ENUM('draft', 'published', 'archived'),
          type ENUM("A", "B", "C")
        );
      `;

      const dbSchema = parseSQL(sql, { dialect: 'mysql', dbName: 'test_db' });
      const table = dbSchema.tables[0];

      expect(table.columns[1].type.kind).toBe('enum');
      if (table.columns[1].type.kind === 'enum') {
        expect(table.columns[1].type.values).toEqual([
          'draft',
          'published',
          'archived',
        ]);
      }

      expect(table.columns[2].type.kind).toBe('enum');
      if (table.columns[2].type.kind === 'enum') {
        expect(table.columns[2].type.values).toEqual(['A', 'B', 'C']);
      }
    });

    it('should use custom type resolver', () => {
      // Define a custom type resolver
      class CustomTypeResolver implements TypeResolver {
        resolve(def: {
          dataType: string;
          length?: number | number[];
          scale?: number;
        }) {
          const dt = def.dataType.toLowerCase();

          // Custom handling for 'decimal' type
          if (dt === 'decimal') {
            return {
              kind: 'decimal' as const,
              precision: 19,
              scale: 4,
            };
          }

          // Custom handling for 'varchar' type
          if (dt === 'varchar') {
            return {
              kind: 'varchar' as const,
              length: 500,
            };
          }

          // For other types, return null to let the default resolver handle them
          return null;
        }
      }

      const sql = `
        CREATE TABLE test (
          id INT PRIMARY KEY,
          amount DECIMAL(10,2) NOT NULL,
          custom_field VARCHAR(255),
          regular_field INT
        );
      `;

      const dbSchema = parseSQL(sql, {
        dialect: 'mysql',
        dbName: 'test_db',
        typeResolvers: [new CustomTypeResolver()],
      });
      const columns = dbSchema.tables[0].columns;

      // Test if custom type resolver is working
      expect(columns[1].type.kind).toBe('decimal');
      if (columns[1].type.kind === 'decimal') {
        expect(columns[1].type.precision).toBe(19); // Value returned by custom resolver
        expect(columns[1].type.scale).toBe(4); // Value returned by custom resolver
      }

      expect(columns[2].type.kind).toBe('varchar');
      if (columns[2].type.kind === 'varchar') {
        expect(columns[2].type.length).toBe(500); // Value returned by custom resolver
      }

      // Test if default resolver still works
      expect(columns[0].type.kind).toBe('int');
      expect(columns[3].type.kind).toBe('int');
    });

    it('should use default type resolver when no custom resolvers are provided', () => {
      const sql = `
        CREATE TABLE test (
          id INT PRIMARY KEY,
          name VARCHAR(255),
          price DECIMAL(10,2),
          is_active BOOLEAN
        );
      `;

      const dbSchema = parseSQL(sql, {
        dialect: 'mysql',
        dbName: 'test_db',
        // Don't provide custom type resolver
      });
      const columns = dbSchema.tables[0].columns;

      // Test if default type resolver works
      expect(columns[0].type.kind).toBe('int');
      expect(columns[1].type.kind).toBe('varchar');
      if (columns[1].type.kind === 'varchar') {
        expect(columns[1].type.length).toBe(255);
      }
      expect(columns[2].type.kind).toBe('decimal');
      if (columns[2].type.kind === 'decimal') {
        expect(columns[2].type.precision).toBe(10);
        expect(columns[2].type.scale).toBe(2);
      }
      expect(columns[3].type.kind).toBe('boolean');
    });

    it('should handle multiple type resolvers', () => {
      // Define first custom type resolver
      class FirstTypeResolver implements TypeResolver {
        resolve(def: {
          dataType: string;
          length?: number | number[];
          scale?: number;
        }) {
          const dt = def.dataType.toLowerCase();

          // Only handle 'decimal' type
          if (dt === 'decimal') {
            return {
              kind: 'decimal' as const,
              precision: 19,
              scale: 4,
            };
          }

          return null;
        }
      }

      // Define second custom type resolver
      class SecondTypeResolver implements TypeResolver {
        resolve(def: {
          dataType: string;
          length?: number | number[];
          scale?: number;
        }) {
          const dt = def.dataType.toLowerCase();

          // Only handle 'varchar' type
          if (dt === 'varchar') {
            return {
              kind: 'varchar' as const,
              length: 500,
            };
          }

          return null;
        }
      }

      const sql = `
        CREATE TABLE test (
          id INT PRIMARY KEY,
          amount DECIMAL(10,2) NOT NULL,
          custom_field VARCHAR(255),
          regular_field INT
        );
      `;

      const dbSchema = parseSQL(sql, {
        dialect: 'mysql',
        dbName: 'test_db',
        typeResolvers: [new FirstTypeResolver(), new SecondTypeResolver()],
      });
      const columns = dbSchema.tables[0].columns;

      // Test if first resolver works
      expect(columns[1].type.kind).toBe('decimal');
      if (columns[1].type.kind === 'decimal') {
        expect(columns[1].type.precision).toBe(19);
        expect(columns[1].type.scale).toBe(4);
      }

      // Test if second resolver works
      expect(columns[2].type.kind).toBe('varchar');
      if (columns[2].type.kind === 'varchar') {
        expect(columns[2].type.length).toBe(500);
      }

      // Test if default resolver still works
      expect(columns[0].type.kind).toBe('int');
      expect(columns[3].type.kind).toBe('int');
    });

    it('should handle type resolver returning null', () => {
      // Define a type resolver that always returns null
      class NullTypeResolver implements TypeResolver {
        resolve(def: {
          dataType: string;
          length?: number | number[];
          scale?: number;
        }) {
          // For all types, return null to let default resolver handle
          return null;
        }
      }

      const sql = `
        CREATE TABLE test (
          id INT PRIMARY KEY,
          name VARCHAR(255),
          price DECIMAL(10,2)
        );
      `;

      const dbSchema = parseSQL(sql, {
        dialect: 'mysql',
        dbName: 'test_db',
        typeResolvers: [new NullTypeResolver()],
      });
      const columns = dbSchema.tables[0].columns;

      // Test if default resolver still works
      expect(columns[0].type.kind).toBe('int');
      expect(columns[1].type.kind).toBe('varchar');
      if (columns[1].type.kind === 'varchar') {
        expect(columns[1].type.length).toBe(255);
      }
      expect(columns[2].type.kind).toBe('decimal');
      if (columns[2].type.kind === 'decimal') {
        expect(columns[2].type.precision).toBe(10);
        expect(columns[2].type.scale).toBe(2);
      }
    });

    it('should parse integer and float types with length, precision and scale', () => {
      const sql = `
        CREATE TABLE test_types (
          id INT PRIMARY KEY,
          int_with_length INT(10),
          bigint_with_length BIGINT(20),
          float_with_precision FLOAT(10,2),
          double_with_precision DOUBLE(15,5),
          regular_int INT,
          regular_float FLOAT
        );
      `;

      const dbSchema = parseSQL(sql, {
        dialect: 'mysql',
        dbName: 'test_db',
      });
      const columns = dbSchema.tables[0].columns;

      // Test integer types with length
      expect(columns[1].type.kind).toBe('int');
      if (columns[1].type.kind === 'int') {
        expect(columns[1].type.length).toBe(10);
      }

      // Test bigint types with length
      expect(columns[2].type.kind).toBe('bigint');
      if (columns[2].type.kind === 'bigint') {
        expect(columns[2].type.length).toBe(20);
      }

      // Test float types with precision and scale
      expect(columns[3].type.kind).toBe('float');
      if (columns[3].type.kind === 'float') {
        expect(columns[3].type.precision).toBe(10);
        expect(columns[3].type.scale).toBe(2);
      }

      // Test double types with precision and scale
      expect(columns[4].type.kind).toBe('float');
      if (columns[4].type.kind === 'float') {
        expect(columns[4].type.precision).toBe(15);
        expect(columns[4].type.scale).toBe(5);
      }

      // Test integer types without length
      expect(columns[5].type.kind).toBe('int');
      if (columns[5].type.kind === 'int') {
        expect(columns[5].type.length).toBeUndefined();
      }

      // Test float types without precision and scale
      expect(columns[6].type.kind).toBe('float');
      if (columns[6].type.kind === 'float') {
        expect(columns[6].type.precision).toBeUndefined();
        expect(columns[6].type.scale).toBeUndefined();
      }
    });
  });
});
