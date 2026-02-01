import { Reader } from './index';

export class StringReader implements Reader {
  private sql: string;

  /**
   * 构造函数
   * @param sql SQL 字符串
   */
  constructor(sql: string) {
    this.sql = sql;
  }

  /**
   * 读取 SQL 内容
   * @returns Promise<string> SQL 内容
   */
  async read(): Promise<string> {
    return this.sql;
  }
}
