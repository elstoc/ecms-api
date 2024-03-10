import { IDatabaseAdapter } from '../../adapters/IDatabaseAdapter';
import { IMediaDb } from './IMediaDb';
import { Config } from '../../utils';
import { IStorageAdapter } from '../../adapters/IStorageAdapter';
import { SQLiteDatabaseAdapter } from '../../adapters';
import { dbVersionSql } from './dbVersionSql';
import path from 'path';

export class MediaDb implements IMediaDb {
    private apiPath: string;
    private database?: IDatabaseAdapter;
    private dbVersion?: number;

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
            const { ver } = await this.database.get<{ ver: number }>(versionSql);
            return ver;
        }
        return 0;
    }

    public async getVersion(): Promise<number> {
        return this.dbVersion ?? 0;
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
