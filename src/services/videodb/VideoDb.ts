import { IDatabaseAdapter } from '../../adapters/IDatabaseAdapter';
import { IVideoDb, LookupRow, LookupValues, LookupTables, Video } from './IVideoDb';
import { Config } from '../../utils';
import { IStorageAdapter } from '../../adapters/IStorageAdapter';
import { SQLiteDatabaseAdapter } from '../../adapters';
import { dbVersionSql } from './dbVersionSql';
import path from 'path';

export class VideoDb implements IVideoDb {
    private apiPath: string;
    private database?: IDatabaseAdapter;
    private dbVersion?: number;
    private lookupTableCache: { [key: string]: LookupValues } = {};

    public constructor(
        apiPath: string,
        private config: Config,
        private storage: IStorageAdapter,
    ) {
        this.apiPath = apiPath.replace(/^\//, '');
    }

    public async initialise(): Promise<void> {
        if (!this.database) {
            const dbContentPath = path.join(this.apiPath, 'data.db');
            const dbFullPath = this.storage.getContentFullPath(dbContentPath);

            if (!this.storage.contentFileExists(dbContentPath)) {
                this.dbVersion = 0;
                await this.storage.storeContentFile(dbContentPath, Buffer.from(''));
            }

            this.database = new SQLiteDatabaseAdapter(dbFullPath);
            await this.database.initialise();
            await this.database.exec('PRAGMA foreign_keys = ON');
            await this.upgradeDb();
        }
    }

    private async upgradeDb(): Promise<void> {
        const latestVersion = dbVersionSql.length;
        this.dbVersion ??= await this.retrieveVersion();
        if (latestVersion > this.dbVersion) {
            for (const versionSql of dbVersionSql.slice(this.dbVersion)) {
                await this.database?.exec(versionSql);
            }
            await this.storeVersion(latestVersion);
        }
    }

    private async retrieveVersion(): Promise<number> {
        if (this.database) {
            const versionSql = 'SELECT IFNULL(MAX(version), 0) AS ver FROM db_version';
            const result = await this.database.get<{ ver: number }>(versionSql);
            if (result) {
                return result.ver;
            }
        }
        return 0;
    }

    public async getVersion(): Promise<number> {
        return this.dbVersion ?? 0;
    }

    public async getLookupValues(tableSuffix: string): Promise<LookupValues> {
        const tableName = `l_${tableSuffix}` as LookupTables;
        if (!Object.values(LookupTables).includes(tableName)) {
            throw new Error(`invalid table suffix ${tableSuffix}`);
        }

        if (this.lookupTableCache[tableName]) {
            return this.lookupTableCache[tableName];
        }

        const sql = `SELECT code, description FROM ${tableName}`;
        const lookupRows = await this.database?.getAll<LookupRow>(sql);

        if (!lookupRows) {
            throw new Error(`No records found in ${tableName}`);
        }

        const returnVal: LookupValues = {};
        lookupRows.forEach((row) => {
            returnVal[row.code] = row.description;
        });
        this.lookupTableCache[tableName] = returnVal;

        return returnVal;
    }

    public async addVideo(video: Video): Promise<void> {
        const sql = `INSERT INTO videos
                     (name, category, director, length_mins, to_watch_priority, progress)
                     VALUES
                     ($name, $category, $director, $length_mins, $to_watch_priority, $progress)`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: any = {};
        let key: keyof Video;
        // prefix all column names with $
        for (key in video) {
            params[`$${key}`] = video[key];
        }
        await this.database?.runWithParams(sql, params);
    }

    private async storeVersion(version: number): Promise<void> {
        const sql = `UPDATE db_version SET version = ${version};`;
        await this.database?.exec(sql);
        this.dbVersion = version;
    }

    public async shutdown(): Promise<void> {
        await this.database?.close();
    }
}
