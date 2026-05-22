import { readSQLFromString, readSQLFromFile } from '../src/reader';

describe('Reader', () => {
  describe('readSQLFromString', () => {
    it('should return the SQL string content', async () => {
      const sqlContent = 'CREATE TABLE users (id INT PRIMARY KEY);';
      const content = await readSQLFromString(sqlContent);
      expect(content).toBe(sqlContent);
    });

    it('should throw error for empty string', async () => {
      await expect(readSQLFromString('')).rejects.toThrow('SQL string is required');
    });

    it('should throw error for undefined', async () => {
      await expect(readSQLFromString(undefined as any)).rejects.toThrow('SQL string is required');
    });
  });

  describe('readSQLFromFile', () => {
    it('should throw error for empty path', async () => {
      await expect(readSQLFromFile('')).rejects.toThrow('File path is required');
    });

    it('should throw error for undefined path', async () => {
      await expect(readSQLFromFile(undefined as any)).rejects.toThrow('File path is required');
    });

    it('should throw error for non-existent file', async () => {
      await expect(readSQLFromFile('/nonexistent/file.sql')).rejects.toThrow('File not found');
    });
  });
});
