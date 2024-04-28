import { IDatabaseAdapter } from '../../adapters/IDatabaseAdapter';
import { IVideoDb, LookupRow, LookupValues, LookupTables, Video, VideoWithId, VideoQueryParams } from './IVideoDb';
import { IStorageAdapter } from '../../adapters/IStorageAdapter';
import { dbVersionSql } from './dbVersionSql';
import path from 'path';
import { Logger } from 'winston';
import { NotFoundError } from '../../errors';

export class VideoDb implements IVideoDb {
    private apiPath: string;
    private database?: IDatabaseAdapter;
    private dbVersion?: number;
    private lookupTableCache: { [key: string]: LookupValues } = {};

    public constructor(
        apiPath: string,
        private logger: Logger,
        private storage: IStorageAdapter,
    ) {
        this.apiPath = apiPath.replace(/^\//, '');
    }

    public async initialise(): Promise<void> {
        if (!this.database) {
            this.logger.info(`initialising database at ${this.apiPath}`);
            const dbContentPath = path.join(this.apiPath, 'data.db');
            if (!this.storage.contentFileExists(dbContentPath)) {
                this.dbVersion = 0;
            }
            this.database = await this.storage.getContentDb(dbContentPath);
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

    public async updateVideo(video: VideoWithId): Promise<void> {
        await this.throwIfNoVideo(video.id);

        const sql = `UPDATE videos
                     SET name = $name,
                         category = $category,
                         director = $director,
                         length_mins = $length_mins,
                         to_watch_priority = $to_watch_priority,
                         progress = $progress
                     WHERE id = $id`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: any = {};
        let key: keyof VideoWithId;
        // prefix all column names with $
        for (key in video) {
            params[`$${key}`] = video[key];
        }
        await this.database?.runWithParams(sql, params);
    }

    public async getVideo(id: number): Promise<VideoWithId> {
        await this.throwIfNoVideo(id);
        const sql = `SELECT id, name, category, director, length_mins, to_watch_priority, progress FROM videos WHERE id = ${id}`;
        const result = await this.database?.get<VideoWithId>(sql);
        if (!result) {
            throw new Error(`Unexpected error getting video ${id}`);
        }
        return result;
    }

    public async queryVideos(queryParams?: VideoQueryParams): Promise<VideoWithId[]> {
        let params: { [key: string]: unknown } = {};
        const whereClauses: string[] = [];
        let sql = `SELECT id, name, category, director, length_mins, to_watch_priority, progress
                     FROM videos`;

        const { maxLength, categories } = queryParams || {};
        if (maxLength) {
            whereClauses.push('length_mins <= $maxLength');
            params['$maxLength'] = maxLength;
        }
        if (categories) {
            const categoryParams: { [key: string]: string } = {};
            categories.forEach((category, index) => {
                categoryParams['$category' + index.toString()] = category;
            });
            whereClauses.push(`category IN (${Object.keys(categoryParams).join(', ')})`);
            params = { ...params, ...categoryParams };
        }

        if (whereClauses.length > 0) {
            sql += ` WHERE (${whereClauses.join(') AND (')})`;
        }

        const result = await this.database?.getAllWithParams<VideoWithId>(sql, params);
        if (!result) {
            throw new Error('Unexpected error querying videos');
        }
        return result;
    }

    private async throwIfNoVideo(id: number): Promise<void> {
        const sql = `SELECT COUNT() AS video_exists FROM videos WHERE id=${id}`;
        const result = await this.database?.get<{ video_exists: number }>(sql);
        if (!result || result.video_exists === 0) {
            throw new NotFoundError(`video id ${id} does not exist`);
        }
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
