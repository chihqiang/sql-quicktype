import { generateCodeToFiles, type GenerateOptions, type Language } from '../src/cli/output';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CLI', () => {
  const sql = 'CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));';

  describe('generateCodeToFiles', () => {
    let tmpDir: string;
    let baseOptions: GenerateOptions;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sql-quicktype-test-'));
      baseOptions = {
        output: tmpDir,
        language: 'typescript' as Language,
        mode: 'single',
        dialect: 'mysql',
        dbName: 'test',
      };
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should generate a single file in single mode', async () => {
      await generateCodeToFiles(sql, baseOptions);
      const files = fs.readdirSync(tmpDir);
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/\.ts$/);
    });

    it('should generate multiple files in multi mode', async () => {
      const multiSql = `
        CREATE TABLE users (id INT PRIMARY KEY);
        CREATE TABLE posts (id INT PRIMARY KEY);
      `;
      await generateCodeToFiles(multiSql, { ...baseOptions, mode: 'multi' });
      const files = fs.readdirSync(tmpDir);
      expect(files.length).toBeGreaterThanOrEqual(2);
    });

    it('should create output directory if it does not exist', async () => {
      const newDir = path.join(tmpDir, 'nested', 'output');
      await generateCodeToFiles(sql, { ...baseOptions, output: newDir });
      expect(fs.existsSync(newDir)).toBe(true);
      const files = fs.readdirSync(newDir);
      expect(files).toHaveLength(1);
    });

    it('should throw for invalid language', async () => {
      await expect(
        generateCodeToFiles(sql, { ...baseOptions, language: 'invalid' as Language })
      ).rejects.toThrow('Invalid language');
    });

    it('should generate Go files with .go extension', async () => {
      await generateCodeToFiles(sql, { ...baseOptions, language: 'go' });
      const files = fs.readdirSync(tmpDir);
      expect(files[0]).toMatch(/\.go$/);
    });

    it('should add package statement in Go mode', async () => {
      await generateCodeToFiles(sql, {
        ...baseOptions,
        language: 'go',
        namespace: 'mypkg',
      });
      const filePath = path.join(tmpDir, fs.readdirSync(tmpDir)[0]);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('package mypkg');
    });

    it('should generate per-table files in multi mode with correct namespace', async () => {
      const multiSql = `
        CREATE TABLE users (id INT PRIMARY KEY);
        CREATE TABLE posts (id INT PRIMARY KEY);
      `;
      await generateCodeToFiles(multiSql, {
        ...baseOptions,
        language: 'gorm',
        mode: 'multi',
        namespace: 'models',
      });
      const files = fs.readdirSync(tmpDir);
      expect(files).toContain('users.go');
      expect(files).toContain('posts.go');
      const userContent = fs.readFileSync(path.join(tmpDir, 'users.go'), 'utf-8');
      expect(userContent).toContain('package models');
    });

    it('should include time import in per-table files in multi mode', async () => {
      const multiSql = `
        CREATE TABLE events (
          id INT PRIMARY KEY,
          created_at DATETIME NOT NULL
        );
      `;
      await generateCodeToFiles(multiSql, {
        ...baseOptions,
        language: 'gorm',
        mode: 'multi',
      });

      const content = fs.readFileSync(path.join(tmpDir, 'events.go'), 'utf-8');
      expect(content).toContain('import "time"');
      expect(content).toContain('time.Time');
    });

    it('should not import time when no date columns exist', async () => {
      await generateCodeToFiles(sql, {
        ...baseOptions,
        language: 'gorm',
        mode: 'multi',
      });

      const content = fs.readFileSync(path.join(tmpDir, 'users.go'), 'utf-8');
      expect(content).not.toContain('import "time"');
    });

    it('should map tinyint(1) to int when requested', async () => {
      const tinySql = `
        CREATE TABLE flags (
          id INT PRIMARY KEY,
          status TINYINT(1) NOT NULL
        );
      `;
      await generateCodeToFiles(tinySql, {
        ...baseOptions,
        language: 'gorm',
        mode: 'multi',
        tinyint1AsInt: true,
      });

      const content = fs.readFileSync(path.join(tmpDir, 'flags.go'), 'utf-8');
      expect(content).toContain('Status int');
      expect(content).not.toContain('Status bool');
    });

    it('should use default namespace for Go generators', async () => {
      await generateCodeToFiles(sql, {
        ...baseOptions,
        language: 'gorm',
        mode: 'single',
      });
      const filePath = path.join(tmpDir, fs.readdirSync(tmpDir)[0]);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('package models');
    });
  });
});
