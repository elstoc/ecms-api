export interface IDatabaseAdapter {
    initialise(): Promise<void>;
    close(): Promise<void>;
    exec(sql: string): Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runWithParams(sql: string, parameters: any): Promise<void>;
    get<T>(sql: string): Promise<T | undefined>;
    getAll<T>(sql: string): Promise<T[] | undefined>;
}
