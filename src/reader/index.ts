export interface Reader {
  /**
   * 读取 SQL 内容
   * @returns Promise<string> SQL 内容
   */
  read(): Promise<string>;
}
