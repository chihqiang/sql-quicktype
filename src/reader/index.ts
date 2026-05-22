import * as fs from 'fs/promises';

export async function readSQLFromFile(path: string): Promise<string> {
  if (!path) {
    throw new Error('File path is required');
  }
  try {
    return await fs.readFile(path, 'utf-8');
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      throw new Error(`File not found: ${path}`);
    }
    throw error;
  }
}

export async function readSQLFromString(sql: string): Promise<string> {
  if (!sql) {
    throw new Error('SQL string is required');
  }
  return sql;
}
