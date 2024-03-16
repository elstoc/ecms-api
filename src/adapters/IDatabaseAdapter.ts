export interface IDatabaseAdapter {
    initialise(): Promise<void>;
    close(): Promise<void>;
    exec(sql: string): Promise<void>;
    get<T>(sql: string): Promise<T>;
    getAll<T>(sql: string): Promise<T[]>;
}
