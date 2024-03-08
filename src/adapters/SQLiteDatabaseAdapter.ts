import { IDatabaseAdapter } from './IDatabaseAdapter';
import { Database } from 'sqlite3';

export class SQLiteDatabaseAdapter implements IDatabaseAdapter {
    private database?: Database;

    public constructor(private dbFullPath: string) { }

    public initialise(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.database = new Database(this.dbFullPath, (err: Error | null) => {
                err ? reject(err) : resolve();
            });
        });
    }

    public close(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.database?.close((err: Error | null) => {
                err ? reject(err) : resolve();
            });
        });
    }

    public get<T>(sql: string): Promise<T> {
        return new Promise((resolve, reject) => {
            this.database?.get<T>(sql, (err: Error | null, row: T) => {
                err ? reject(err) : resolve(row);
            });
        });
    }

    public exec(sql: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.database?.exec(sql, (err: Error | null) => {
                err ? reject(err) : resolve();
            });
        });
    }
}
