import { AST } from 'node-sql-parser';

interface DatabaseSchema {
    name: string;
    dialect: string;
    charset?: string;
    collation?: string;
    comment?: string;
    tables: TableSchema[];
    metadata?: {
        createdAt?: string;
        updatedAt?: string;
        version?: string;
        engine?: string;
        [key: string]: unknown;
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
    dialect: string;
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
        value: unknown;
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

declare const LANGUAGES: readonly ["go", "typescript", "gorm", "xorm"];
type Language = typeof LANGUAGES[number];
declare const MODES: readonly ["single", "multi"];
type Mode = typeof MODES[number];

interface Options {
    language: Language;
    generateComments?: boolean;
    namespace?: string;
}
declare abstract class BaseGenerator {
    abstract generateDatabase(database: DatabaseSchema): string;
    abstract generateTable(table: TableSchema): string;
    abstract generateColumn(column: ColumnSchema): string;
    abstract mapSQLType(type: SQLType): string;
    protected formatTypeName(name: string): string;
    protected formatPascalCase(name: string): string;
    protected formatFieldName(name: string): string;
    protected generateDefaultValue(column: ColumnSchema): string;
    private needsTimeCache;
    protected needsTimeImport(database: DatabaseSchema): boolean;
}
declare class GeneratorFactory {
    private static registry;
    static register(language: string, constructor: new (options: Options) => BaseGenerator): void;
    static createGenerator(language: Language, options?: Options): BaseGenerator;
}

declare class TypeScriptGenerator extends BaseGenerator {
    private options;
    constructor(options?: Options);
    protected formatFieldName(name: string): string;
    generateDatabase(database: DatabaseSchema): string;
    generateTable(table: TableSchema): string;
    generateColumn(column: ColumnSchema): string;
    mapSQLType(type: SQLType, columnName?: string): string;
}

declare class GoGenerator extends BaseGenerator {
    private options;
    constructor(options?: Options);
    generateDatabase(database: DatabaseSchema): string;
    generateTable(table: TableSchema): string;
    generateColumn(column: ColumnSchema): string;
    mapSQLType(type: SQLType): string;
    private generateGoTag;
}

declare class GormGenerator extends BaseGenerator {
    private options;
    constructor(options?: Options);
    generateDatabase(database: DatabaseSchema): string;
    generateTable(table: TableSchema): string;
    generateColumn(column: ColumnSchema): string;
    mapSQLType(type: SQLType): string;
    private generateGormTag;
}

declare class XormGenerator extends BaseGenerator {
    private options;
    constructor(options?: Options);
    generateDatabase(database: DatabaseSchema): string;
    generateTable(table: TableSchema): string;
    generateColumn(column: ColumnSchema): string;
    mapSQLType(type: SQLType): string;
    private generateXormTag;
}

interface GenerateOptions {
    output: string;
    language: Language;
    mode: Mode;
    namespace?: string;
    dialect: string;
    dbName: string;
}

declare function generateCode(sql: string, options: {
    language: 'go' | 'typescript' | 'gorm' | 'xorm';
    namespace?: string;
    dialect?: string;
    dbName?: string;
}): string;

export { BaseGenerator, type BigIntType, type BooleanType, type ColumnSchema, type DatabaseSchema, type DateTimeType, type DateType, type DecimalType, type EnumType, type FloatType, type GenerateOptions, GeneratorFactory, GoGenerator, GormGenerator, type IntType, type JsonType, SQLParser, type SQLParserOptions, type SQLType, type TableIndex, type TableSchema, type TextType, type TypeResolver, TypeScriptGenerator, type VarcharType, XormGenerator, generateCode, parseSQL };
