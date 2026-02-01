import { AST } from 'node-sql-parser';

interface DatabaseSchema {
    name: string;
    dialect: 'mysql' | 'postgres' | 'sqlite' | 'sqlserver' | string;
    charset?: string;
    collation?: string;
    comment?: string;
    tables: TableSchema[];
    metadata?: {
        createdAt?: string;
        updatedAt?: string;
        version?: string;
        engine?: string;
        [key: string]: any;
    };
    tablesMap?: Record<string, TableSchema>;
}
interface TableSchema {
    name: string;
    comment?: string;
    schema?: string;
    primaryKeys?: string[];
    autoIncrement?: boolean;
    columns: ColumnSchema[];
    foreignKeys?: TableForeignKey[];
    indexes?: TableIndex[];
}
interface TableForeignKey {
    name?: string;
    columns: string[];
    referencedTable: string;
    referencedColumns: string[];
    onDelete?: string;
    onUpdate?: string;
}
interface ColumnSchema {
    name: string;
    type: SQLType;
    nullable: boolean;
    primaryKey: boolean;
    unique: boolean;
    default?: string | null;
    comment?: string;
    unsigned?: boolean;
    generated?: boolean;
}
interface TableIndex {
    name: string;
    columns: string[];
    unique?: boolean;
    type?: string;
}
type SQLType = IntType | BigIntType | FloatType | DecimalType | VarcharType | TextType | BooleanType | DateType | DateTimeType | JsonType | EnumType;
interface IntType {
    kind: 'int';
    length?: number;
}
interface BigIntType {
    kind: 'bigint';
    length?: number;
}
interface FloatType {
    kind: 'float';
    precision?: number;
    scale?: number;
}
interface DecimalType {
    kind: 'decimal';
    precision?: number;
    scale?: number;
}
interface VarcharType {
    kind: 'varchar';
    length?: number;
}
interface TextType {
    kind: 'text';
}
interface BooleanType {
    kind: 'boolean';
}
interface DateType {
    kind: 'date';
}
interface DateTimeType {
    kind: 'datetime';
}
interface JsonType {
    kind: 'json';
}
interface EnumType {
    kind: 'enum';
    values: string[];
}

interface TypeResolver {
    resolve(def: ColumnDefinition['definition']): SQLType | null;
}
interface SQLParserOptions {
    dialect: 'mysql' | 'postgres' | 'sqlite' | 'sqlserver' | string;
    dbName?: string;
    strictMode?: boolean;
    ignoreComments?: boolean;
    parseForeignKeys?: boolean;
    parseIndexes?: boolean;
    typeResolvers?: TypeResolver[];
}
interface ColumnDefinition {
    resource: 'column';
    column: {
        column: string;
    };
    definition: {
        dataType: string;
        length?: number | number[];
        scale?: number;
        unsigned?: boolean;
        generated?: boolean;
        expr?: {
            value: Array<{
                value?: string;
                raw?: string;
            }>;
        };
    };
    nullable?: {
        type: string;
    };
    primary_key?: boolean;
    unique?: boolean;
    default_val?: {
        value: any;
    };
    comment?: {
        value: {
            value: string;
        };
    };
}
declare function parseSQL(sql: string, options?: SQLParserOptions): DatabaseSchema;
declare class SQLParser {
    options: SQLParserOptions & {
        strictMode: boolean;
        ignoreComments: boolean;
        parseForeignKeys: boolean;
        parseIndexes: boolean;
        typeResolvers: TypeResolver[];
    };
    private parser;
    constructor(options?: SQLParserOptions);
    parseDatabase(ast: AST[], dbName?: string): DatabaseSchema;
    private isCreateTable;
    private parseTable;
    private parseColumn;
    private parseTableConstraint;
    private parseIndex;
    private defaultTypeResolver;
    private mapSQLType;
    private parseDefault;
}

declare class XormGenerator extends AGenerator {
    private options;
    constructor(options?: Options);
    generateDatabase(database: DatabaseSchema): string;
    generateTable(table: TableSchema): string;
    generateColumn(column: ColumnSchema): string;
    mapSQLType(type: SQLType): string;
    private generateXormTag;
}

declare class GormGenerator extends AGenerator {
    private options;
    constructor(options?: Options);
    generateDatabase(database: DatabaseSchema): string;
    generateTable(table: TableSchema): string;
    generateColumn(column: ColumnSchema): string;
    mapSQLType(type: SQLType): string;
    private generateGormTag;
}

declare class GolangGenerator extends AGenerator {
    private options;
    constructor(options?: Options);
    generateDatabase(database: DatabaseSchema): string;
    generateTable(table: TableSchema): string;
    generateColumn(column: ColumnSchema): string;
    mapSQLType(type: SQLType): string;
    private generateGoTag;
}

declare class TypeScriptGenerator extends AGenerator {
    private options;
    constructor(options?: Options);
    protected formatFieldName(name: string): string;
    generateDatabase(database: DatabaseSchema): string;
    generateTable(table: TableSchema): string;
    generateColumn(column: ColumnSchema): string;
    mapSQLType(type: SQLType, columnName?: string): string;
}

interface Options {
    language: 'go' | 'typescript' | 'gorm' | 'xorm';
    generateComments?: boolean;
    namespace?: string;
}
declare abstract class AGenerator {
    abstract generateDatabase(database: DatabaseSchema): string;
    abstract generateTable(table: TableSchema): string;
    abstract generateColumn(column: ColumnSchema): string;
    abstract mapSQLType(type: SQLType): string;
    protected formatTypeName(name: string): string;
    protected formatFieldName(name: string): string;
    protected generateDefaultValue(column: ColumnSchema): string;
    protected needsTimeImport(database: DatabaseSchema): boolean;
}
declare class GeneratorFactory {
    static createGenerator(language: 'go' | 'typescript' | 'gorm' | 'xorm', options?: Options): Promise<TypeScriptGenerator | GolangGenerator | GormGenerator | XormGenerator>;
}

interface GenerateOptions {
    output: string;
    language: string;
    mode: string;
    namespace?: string;
    dialect: string;
    dbName: string;
}

declare function generateCode(sql: string, options: {
    language: 'go' | 'typescript' | 'gorm' | 'xorm';
    namespace?: string;
    dialect?: string;
    dbName?: string;
}): Promise<string>;

interface Reader {
    read(): Promise<string>;
}

interface ReaderOptions {
    type: 'string' | 'file';
    source: string;
    [key: string]: any;
}
declare class ReaderFactory {
    static createReader(options: ReaderOptions): Reader;
}

declare class StringReader implements Reader {
    private sql;
    constructor(sql: string);
    read(): Promise<string>;
}

declare class FileReader implements Reader {
    private filePath;
    constructor(filePath: string);
    read(): Promise<string>;
}

export { AGenerator, type BigIntType, type BooleanType, type ColumnSchema, type DatabaseSchema, type DateTimeType, type DateType, type DecimalType, type EnumType, FileReader, type FloatType, type GenerateOptions, GeneratorFactory, GolangGenerator, GormGenerator, type IntType, type JsonType, type Reader, ReaderFactory, type ReaderOptions, SQLParser, type SQLParserOptions, type SQLType, StringReader, type TableIndex, type TableSchema, type TextType, type TypeResolver, TypeScriptGenerator, type VarcharType, XormGenerator, generateCode, parseSQL };
