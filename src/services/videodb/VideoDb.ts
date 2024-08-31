import path from 'path';
import { Logger } from 'winston';

import { IDatabaseAdapter } from '../../adapters/IDatabaseAdapter';
import { IVideoDb, LookupRow, LookupValues, LookupTables, Video, VideoWithId, VideoFilters, videoFields, videoSummaryFields, VideoSummaryAndPrimaryMedium } from './IVideoDb';
import { IStorageAdapter } from '../../adapters/IStorageAdapter';
import { dbUpgradeSql } from './dbUpgradeSql';
import { NotFoundError, NotPermittedError } from '../../errors';
import { Config } from '../../utils';
import { User } from '../auth';
import { userIsAdmin } from '../auth/accessUtils';

const wait = (timeMs: number) => new Promise(resolve => setTimeout(resolve, timeMs));

export class VideoDb implements IVideoDb {
    private apiPath: string;
    private initialising = false;
    private database?: IDatabaseAdapter;
    private dbVersion?: number;
    private lookupTableCache: { [key: string]: LookupValues } = {};

    public constructor(
        apiPath: string,
        private config: Config,
        private logger: Logger,
        private storage: IStorageAdapter,
    ) {
        this.apiPath = apiPath.replace(/^\//, '');
    }

    public async initialise(): Promise<void> {
        while (this.initialising) {
            this.logger.info('waiting for database to initialise');
            await wait(50);
        }

        if (!this.database) {
            this.initialising = true;
            this.logger.info(`initialising database at ${this.apiPath}`);
            const dbContentPath = path.join(this.apiPath, 'data.db');
            if (!this.storage.contentFileExists(dbContentPath)) {
                this.dbVersion = 0;
            }
            this.database = await this.storage.getContentDb(dbContentPath);
            await this.upgrade();
            this.initialising = false;
            this.logger.info(`initialised database at ${this.apiPath}`);
        }
    }

    private async upgrade(): Promise<void> {
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

    public getOmdbApiKey(user?: User): string {
        this.throwIfNotAdmin(user);
        return this.config.omdbApiKey;
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

    public async addVideo(video: Video, user?: User): Promise<number> {
        this.throwIfNotAdmin(user);
        const sql = `INSERT INTO videos
                     (${videoFields.join(', ')})
                     VALUES
                     ($${videoFields.join(', $')})
                     RETURNING id`;
        const params: { [key: string]: unknown } = {};
        let key: keyof Video;
        for (key in video) {
            if (key !== 'tags') {
                params[`$${key}`] = video[key];
            }
        }
        const result = await this.database?.getWithParams<{ id: number }>(sql, params);
        if (!result) {
            throw new Error('Unexpected error creating video');
        }

        await this.createOrReplaceVideoTags(result.id, video.tags);

        return result.id;
    }

    public async updateVideo(video: VideoWithId, user?: User): Promise<void> {
        this.throwIfNotAdmin(user);
        await this.throwIfNoVideo(video.id);

        const setList = videoFields.map((field) => `${field} = $${field}`);
        const sql = `UPDATE videos SET ${setList.join(', ')} WHERE id = $id`;

        let key: keyof VideoWithId;
        const params: { [key: string]: unknown} = {};
        for (key in video) {
            if (key !== 'tags') {
                params[`$${key}`] = video[key];
            }
        }
        await this.database?.runWithParams(sql, params);

        await this.createOrReplaceVideoTags(video.id, video.tags);
    }

    private async createOrReplaceVideoTags(id: number, tags?: string[]): Promise<void> {
        const deleteSql = `DELETE FROM video_tags WHERE video_id = ${id}`;
        await this.database?.exec(deleteSql);

        if (!tags) return;

        const insertSql = `INSERT INTO video_tags (video_id, tag)
                           VALUES ($id, $tag)`;
        
        for (const tag of tags) {
            const params = { '$id': id, $tag: tag };
            await this.database?.runWithParams(insertSql, params);
        }
    }

    public async getVideo(id: number): Promise<VideoWithId> {
        await this.throwIfNoVideo(id);
        const sql = `SELECT id, ${videoFields.join(', ')}
                     FROM   videos
                     WHERE  id = ${id}`;
        const video = await this.database?.get<VideoWithId>(sql);
        if (!video) {
            throw new Error(`Unexpected error getting video ${id}`);
        }
        video.tags = await this.getVideoTags(id);

        return video;
    }

    public async deleteVideo(id: number): Promise<void> {
        await this.throwIfNoVideo(id);
        const sql = `DELETE
                     FROM   videos
                     WHERE  id = ${id}`;
        await this.database?.exec(sql);
    }

    private async getVideoTags(id: number): Promise<string[] | undefined> {
        const sql = `SELECT tag FROM video_tags WHERE video_id = ${id} ORDER BY tag`;
        const tags = await this.database?.getAll<{ tag: string }>(sql);
        if (tags) {
            return tags.map((tagObj) => tagObj.tag);
        }
    }

    public async getAllTags(): Promise<string[]> {
        const sql = 'SELECT DISTINCT tag from video_tags ORDER BY tag';
        const tags = await this.database?.getAll<{ tag: string }>(sql);
        if (tags) {
            return tags.map((tagObj) => tagObj.tag);
        } else {
            return [];
        }
    }

    public async queryVideos(filters?: VideoFilters, limit?: number): Promise<VideoSummaryAndPrimaryMedium[]> {
        let params: { [key: string]: unknown } = {};
        const whereClauses: string[] = [];
        let sql = `SELECT v.${videoSummaryFields.join(', v.')},
                             vt.tags
                      FROM   videos v
					  LEFT OUTER JOIN (
					    SELECT video_id, GROUP_CONCAT(tag) AS tags
                        FROM video_tags
                        GROUP BY video_id ) vt
					  ON v.id =  vt.video_id`;

        const { maxLength, categories, tags, titleContains } = filters || {};
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
        if (tags !== undefined) {
            const tagParams: { [key: string]: string } = {};
            tags.forEach((tag, index) => {
                tagParams['$tag' + index.toString()] = tag;
            });
            whereClauses.push(`EXISTS (SELECT 1 FROM video_tags WHERE video_id = id AND tag IN (${Object.keys(tagParams).join(', ')}))`);
            params = { ...params, ...tagParams };
        }
        if (titleContains !== undefined) {
            whereClauses.push('LOWER(title) LIKE $titleContains');
            params['$titleContains'] = `%${titleContains.toLowerCase()}%`;
        }

        if (whereClauses.length > 0) {
            sql += ` WHERE (${whereClauses.join(') AND (')})`;
        }

        sql += ` ORDER BY (
            CASE WHEN UPPER(title) LIKE 'THE %' THEN SUBSTR(title, 5)
                 WHEN UPPER(title) LIKE 'AN %' THEN SUBSTR(title, 4)
                 WHEN UPPER(title) LIKE 'A %' THEN SUBSTR(title, 3)
                 ELSE title
            END
        )`;

        if (limit) {
            sql += ` LIMIT ${limit}`;
        }

        const videos = await this.database?.getAllWithParams<VideoSummaryAndPrimaryMedium>(sql, params);
        if (!videos) {
            throw new Error('Unexpected error querying videos');
        }
        return videos;
    }

    private throwIfNotAdmin(user?: User): void {
        if (this.config.enableAuthentication && !userIsAdmin(user)) throw new NotPermittedError();
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
