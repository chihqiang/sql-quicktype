import { Reader } from './index';
import * as fs from 'fs/promises';

export class FileReader implements Reader {
  private filePath: string;

  /**
   * 构造函数
   * @param filePath SQL 文件路径
   */
  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * 读取 SQL 内容
   * @returns Promise<string> SQL 内容
   * @throws Error 文件不存在或读取失败
   */
  async read(): Promise<string> {
    try {
      // 检查文件是否存在
      await fs.access(this.filePath);
      // 读取文件内容
      const content = await fs.readFile(this.filePath, 'utf-8');
      console.log(`Reading SQL from file: ${this.filePath}`);
      return content;
    } catch (error) {
      if (error instanceof Error) {
        if ((error as any).code === 'ENOENT') {
          throw new Error(`File not found: ${this.filePath}`);
        }
        throw new Error(`Failed to read file: ${error.message}`);
      }
      throw new Error('Unknown error reading file');
    }
  }
}
