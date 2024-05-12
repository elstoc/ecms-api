export interface IDatabaseAdapter {
    initialise(): Promise<void>;
    close(): Promise<void>;
    exec(sql: string): Promise<void>;
    runWithParams(sql: string, params: unknown): Promise<void>;
    get<T>(sql: string): Promise<T | undefined>;
    getWithParams<T>(sql: string, params: unknown): Promise<T | undefined>;
    getAll<T>(sql: string): Promise<T[] | undefined>;
    getAllWithParams<T>(sql: string, params: unknown): Promise<T[] | undefined>;
}
