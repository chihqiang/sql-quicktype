import { ReaderFactory } from '../src/reader/ReaderFactory';

describe('Reader', () => {
  describe('StringReader', () => {
    it('should read string content', async () => {
      const sqlContent = 'CREATE TABLE users (id INT PRIMARY KEY);';
      const reader = ReaderFactory.createReader({
        type: 'string',
        source: sqlContent,
      });

      const content = await reader.read();

      expect(content).toBe(sqlContent);
    });

    it('should throw error for empty string source', () => {
      expect(() => {
        ReaderFactory.createReader({ type: 'string', source: '' });
      }).toThrow('Source is required for string reader');
    });

    it('should throw error for undefined string source', () => {
      expect(() => {
        ReaderFactory.createReader({
          type: 'string',
          source: undefined as any,
        });
      }).toThrow('Source is required for string reader');
    });
  });

  describe('FileReader', () => {
    it('should throw error for empty file source', () => {
      expect(() => {
        ReaderFactory.createReader({ type: 'file', source: '' });
      }).toThrow('Source is required for file reader');
    });

    it('should throw error for undefined file source', () => {
      expect(() => {
        ReaderFactory.createReader({ type: 'file', source: undefined as any });
      }).toThrow('Source is required for file reader');
    });

    // Note: 实际的文件读取测试需要创建临时文件，这里只测试参数验证
  });

  describe('Reader Factory', () => {
    it('should throw error for unsupported reader type', () => {
      expect(() => {
        ReaderFactory.createReader({
          type: 'unsupported' as any,
          source: 'test',
        });
      }).toThrow('Unsupported reader type: unsupported');
    });
  });
});
