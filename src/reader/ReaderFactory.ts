import { Reader } from './index';
import { StringReader } from './StringReader';
import { FileReader } from './FileReader';

export interface ReaderOptions {
  type: 'string' | 'file';
  source: string;
  [key: string]: any;
}

export class ReaderFactory {
  /**
   * 创建 Reader 实例
   * @param options 读取器选项
   * @returns Reader 实例
   * @throws Error 不支持的读取器类型
   */
  static createReader(options: ReaderOptions): Reader {
    switch (options.type) {
      case 'string':
        if (!options.source) {
          throw new Error('Source is required for string reader');
        }
        return new StringReader(options.source);
      case 'file':
        if (!options.source) {
          throw new Error('Source is required for file reader');
        }
        return new FileReader(options.source);
      default:
        throw new Error(`Unsupported reader type: ${options.type}`);
    }
  }
}
