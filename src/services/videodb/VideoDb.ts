import { IDatabaseAdapter } from '../../adapters/IDatabaseAdapter';
import { IVideoDb, LookupRow, LookupValues, LookupTables, Video, VideoWithId, VideoQueryParams, VideoWithIdAndPrimaryMedium, VideoMedia } from './IVideoDb';
import { IStorageAdapter } from '../../adapters/IStorageAdapter';
import { dbUpgradeSql } from './dbUpgradeSql';
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
        const latestVersion = dbUpgradeSql.length;
        this.dbVersion ??= await this.retrieveVersion();
        if (latestVersion > this.dbVersion) {
            for (const versionSql of dbUpgradeSql.slice(this.dbVersion)) {
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

    public async addVideo(video: Video): Promise<number> {
        const sql = `INSERT INTO videos
                     (title, category, director, length_mins, watched, to_watch_priority, progress)
                     VALUES
                     ($title, $category, $director, $length_mins, $watched, $to_watch_priority, $progress)
                     RETURNING id`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: any = {};
        let key: keyof Video;
        // prefix all column names with $
        for (key in video) {
            if (key !== 'media') {
                params[`$${key}`] = video[key];
            }
        }
        const result = await this.database?.getWithParams<{ id: number }>(sql, params);
        if (!result) {
            throw new Error('Unexpected error creating video');
        }

        await this.createOrReplaceVideoMedia(result.id, video.media);

        return result.id;
    }

    public async updateVideo(video: VideoWithId): Promise<void> {
        await this.throwIfNoVideo(video.id);

        const sql = `UPDATE videos
                     SET title = $title,
                         category = $category,
                         director = $director,
                         length_mins = $length_mins,
                         watched = $watched,
                         to_watch_priority = $to_watch_priority,
                         progress = $progress
                     WHERE id = $id`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: any = {};
        let key: keyof VideoWithId;
        // prefix all column names with $
        for (key in video) {
            if (key !== 'media') {
                params[`$${key}`] = video[key];
            }
        }
        await this.database?.runWithParams(sql, params);

        await this.createOrReplaceVideoMedia(video.id, video.media);
    }

    private async createOrReplaceVideoMedia(id: number, media?: VideoMedia[]): Promise<void> {
        const deleteSql = `DELETE FROM video_media WHERE video_id = ${id}`;
        await this.database?.exec(deleteSql);

        if (!media) return;

        const insertSql = `INSERT INTO video_media (video_id, media_type, media_location, watched, notes)
                           VALUES ($id, $media_type, $media_location, $watched, $notes)`;
        
        for (const medium of media) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const params: any = { '$id': id };

            let key: keyof VideoMedia;
            // prefix all column names with $
            for (key in medium) {
                params[`$${key}`] = medium[key];
            }
            await this.database?.runWithParams(insertSql, params);
        }
    }

    public async getVideo(id: number): Promise<VideoWithId> {
        await this.throwIfNoVideo(id);
        const sql = `SELECT id, title, category, director, length_mins, watched, to_watch_priority, progress
                     FROM   videos
                     WHERE  id = ${id}`;
        const video = await this.database?.get<VideoWithId>(sql);
        if (!video) {
            throw new Error(`Unexpected error getting video ${id}`);
        }
        video.media = await this.getVideoMedia(id);

        return video;
    }

    private async getVideoMedia(id: number): Promise<VideoMedia[] | undefined> {
        const sql = `SELECT media_type, media_location, watched, notes
                     FROM video_media
                     INNER JOIN l_media_types
                     ON video_media.media_type = l_media_types.code
                     WHERE video_id = ${id}
                     ORDER BY priority`;
        return await this.database?.getAll<VideoMedia>(sql);
    }

    public async queryVideos(queryParams?: VideoQueryParams): Promise<VideoWithId[]> {
        let params: { [key: string]: unknown } = {};
        const whereClauses: string[] = [];
        let sql = `SELECT v.id, v.title, v.category, v.director, v.length_mins, v.watched, v.to_watch_priority, v.progress,
                             pm.media_type pm_media_type, pm.watched pm_watched
                      FROM   videos v
                      LEFT OUTER JOIN (
                        SELECT vm.*
                        FROM   video_media vm
                        INNER JOIN l_media_types lmt
                        ON vm.media_type = lmt.code
                        WHERE lmt.priority = (
                            SELECT MIN(lmt2.priority)
                            FROM   video_media vm2
                            INNER JOIN l_media_types lmt2
                            ON vm2.media_type = lmt2.code
                            AND vm.video_id = vm2.video_id
                        )
                      ) pm
                      ON v.id = pm.video_id`;

        const { maxLength, categories, titleLike } = queryParams || {};
        if (maxLength !== undefined) {
            whereClauses.push('length_mins <= $maxLength');
            params['$maxLength'] = maxLength;
        }
        if (categories !== undefined) {
            const categoryParams: { [key: string]: string } = {};
            categories.forEach((category, index) => {
                categoryParams['$category' + index.toString()] = category;
            });
            whereClauses.push(`category IN (${Object.keys(categoryParams).join(', ')})`);
            params = { ...params, ...categoryParams };
        }
        if (titleLike !== undefined) {
            whereClauses.push('LOWER(title) LIKE $titleLike');
            params['$titleLike'] = titleLike.toLowerCase();
        }

        if (whereClauses.length > 0) {
            sql += ` WHERE (${whereClauses.join(') AND (')})`;
        }

        const videos = await this.database?.getAllWithParams<VideoWithIdAndPrimaryMedium>(sql, params);
        if (!videos) {
            throw new Error('Unexpected error querying videos');
        }
        return videos;
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
