import { generateCode } from '../src/generate';
import { parseSQL } from '../src/sql-parser';

describe('Integration', () => {
  describe('Full Pipeline: SQL → Code', () => {
    const sql = `
      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    it('should parse SQL and generate TypeScript', () => {
      const code = generateCode(sql, { language: 'typescript' });
      expect(code).toContain('interface Users');
      expect(code).toContain('id?: number');
      expect(code).toContain('name: string');
      expect(code).toContain('email: string');
      expect(code).toContain('isActive?: boolean');
      expect(code).toContain('createdAt?: Date');
    });

    it('should parse SQL and generate Go', () => {
      const code = generateCode(sql, { language: 'go', namespace: 'models' });
      expect(code).toContain('package models');
      expect(code).toContain('type Users struct');
      expect(code).toContain('json:"');
      expect(code).toContain('db:"');
    });

    it('should parse SQL and generate GORM', () => {
      const code = generateCode(sql, {
        language: 'gorm',
        namespace: 'models',
      });
      expect(code).toContain('package models');
      expect(code).toContain('type Users struct');
      expect(code).toContain('gorm:"');
      expect(code).toContain('import "time"');
    });

    it('should parse SQL and generate XORM', () => {
      const code = generateCode(sql, {
        language: 'xorm',
        namespace: 'models',
      });
      expect(code).toContain('package models');
      expect(code).toContain('type Users struct');
      expect(code).toContain('xorm:"');
      expect(code).toContain('import "time"');
    });
  });

  describe('Multi-table input', () => {
    const multiSql = `
      CREATE TABLE departments (
        id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      );
      CREATE TABLE employees (
        id INT PRIMARY KEY,
        department_id INT,
        name VARCHAR(255) NOT NULL,
        salary DECIMAL(10,2)
      );
    `;

    it('should generate all tables in TypeScript', () => {
      const code = generateCode(multiSql, { language: 'typescript' });
      expect(code).toContain('interface Departments');
      expect(code).toContain('interface Employees');
      expect(code).toContain('name: string');
    });

    it('should generate all tables in Go', () => {
      const code = generateCode(multiSql, { language: 'go' });
      expect(code).toContain('type Departments struct');
      expect(code).toContain('type Employees struct');
    });

    it('should generate all tables in GORM', () => {
      const code = generateCode(multiSql, { language: 'gorm' });
      expect(code).toContain('type Departments struct');
      expect(code).toContain('type Employees struct');
    });
  });

  describe('Round-trip stability', () => {
    it('should produce deterministic output for same input', () => {
      const sql = 'CREATE TABLE test (id INT PRIMARY KEY, name VARCHAR(255));';
      const code1 = generateCode(sql, { language: 'typescript' });
      const code2 = generateCode(sql, { language: 'typescript' });
      expect(code1).toBe(code2);
    });

    it('should handle SQL with extra whitespace and semicolons', () => {
      const messySql = `
        CREATE TABLE test (  id INT PRIMARY KEY ,  name VARCHAR(255)  );;
      `;
      const code = generateCode(messySql, { language: 'typescript' });
      expect(code).toContain('interface Test');
      expect(code).toContain('id?: number');
    });
  });

  describe('Parser + Generator consistency', () => {
    it('should output correct column count', () => {
      const sql = `
        CREATE TABLE test (
          a INT,
          b VARCHAR(255),
          c BOOLEAN,
          d DATETIME
        );
      `;
      const schema = parseSQL(sql, { dialect: 'mysql' });
      const tsCode = generateCode(sql, { language: 'typescript' });
      const goCode = generateCode(sql, { language: 'go' });

      expect(schema.tables[0].columns).toHaveLength(4);
      // Each column generates a line in the output
      const tsLines = tsCode.split('\n').filter(l => l.includes(':'));
      expect(tsLines.length).toBeGreaterThanOrEqual(4);
      const goLines = goCode.split('\n').filter(l => l.includes('\t'));
      expect(goLines.length).toBeGreaterThanOrEqual(4);
    });
  });
});
