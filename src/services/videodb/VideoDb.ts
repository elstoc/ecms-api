import path from 'path';
import { Logger } from 'winston';

import { DatabaseAdapter } from '../../adapters/DatabaseAdapter';
import { StorageAdapter } from '../../adapters/StorageAdapter';
import { dbUpgradeSql } from './dbUpgradeSql';
import { NotFoundError, NotPermittedError } from '../../errors';
import { Config } from '../../utils';
import { userIsAdmin } from '../auth/utils/access';
import { User } from '../../contract/auth.contract';

export type Video = {
    title: string;
    category: string;
    director: string | null;
    num_episodes: number | null;
    length_mins: number | null;
    watched: string;
    priority_flag: number | null;
    progress: string | null;
    year: number | null;
    imdb_id: string | null;
    image_url: string | null;
    actors: string | null;
    plot: string | null;
    tags: string | null;
    primary_media_type: string | null;
    primary_media_location: string | null;
    primary_media_watched: string | null;
    other_media_type: string | null;
    other_media_location: string | null;
    media_notes: string | null;
}

export type VideoWithId = Video & { id: number; };

export const videoFields = [
    'title', 'category', 'director', 'num_episodes', 'length_mins', 'watched', 'priority_flag', 'progress',
    'imdb_id', 'image_url', 'year', 'actors', 'plot', 'primary_media_type', 'primary_media_location',
    'primary_media_watched', 'other_media_type', 'other_media_location', 'media_notes'
];

export const videoWithIdFields = ['id', ...videoFields];

export enum LookupTables {
    video_category = 'l_categories',
    video_media_type = 'l_media_types',
    video_media_location = 'l_media_locations',
    video_watched_status = 'l_watched_status',
}

export type LookupRow = {
    code: string;
    description: string;
}

export type LookupValues = {
    [key: string]: string;
}

export type VideoFilters = {
    maxLength?: number;
    categories?: string[];
    tags?: string[];
    titleContains?: string;
    watched?: string;
    mediaWatched?: string;
    sortPriorityFirst?: boolean;
    minResolution?: string;
}

export type VideoUpdate = {
    id: number;
    priority_flag: 0 | 1;
}
const wait = (timeMs: number) => new Promise(resolve => setTimeout(resolve, timeMs));

export class VideoDb {
    private apiPath: string;
    private initialising = false;
    private database?: DatabaseAdapter;
    private dbVersion?: number;
    private lookupTableCache: { [key: string]: LookupValues } = {};

    public constructor(
        apiPath: string,
        private config: Config,
        private logger: Logger,
        private storage: StorageAdapter,
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

    public async patchVideo(update: VideoUpdate, user?: User): Promise<void> {
        this.throwIfNotAdmin(user);

        const sql = `UPDATE videos
                     SET priority_flag = ${update.priority_flag}
                     WHERE id = ${update.id}`;

        await this.database?.exec(sql);
    }

    private async createOrReplaceVideoTags(id: number, tags?: string | null): Promise<void> {
        await this.deleteVideoTags(id);

        if (!tags) return;

        const tagsArray = tags.split('|');

        const insertSql = `INSERT INTO video_tags (video_id, tag)
                           VALUES ($id, $tag)`;
        
        for (const tag of tagsArray) {
            const params = { '$id': id, $tag: tag };
            await this.database?.runWithParams(insertSql, params);
        }
    }

    private async deleteVideoTags(id: number): Promise<void> {
        const deleteSql = `DELETE FROM video_tags WHERE video_id = ${id}`;
        await this.database?.exec(deleteSql);
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
        const tags = await this.getVideoTags(id);
        video.tags = tags?.join('|') ?? '';

        return video;
    }

    public async deleteVideo(id: number, user?: User): Promise<void> {
        this.throwIfNotAdmin(user);
        await this.throwIfNoVideo(id);

        await this.deleteVideoTags(id);

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

    public async queryVideos(filters?: VideoFilters, limit?: number): Promise<VideoWithId[]> {
        let params: { [key: string]: unknown } = {};
        const whereClauses: string[] = [];
        let sql = `SELECT v.${videoWithIdFields.join(', v.')},
                             vt.tags
                      FROM   videos v
					  LEFT OUTER JOIN (
					    SELECT video_id, GROUP_CONCAT(tag, '|') AS tags
                        FROM video_tags
                        GROUP BY video_id ) vt
					  ON v.id =  vt.video_id`;

        const { maxLength, categories, tags, titleContains, watched, mediaWatched, minResolution, sortPriorityFirst } = filters || {};
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
        if (watched === 'Y' || watched === 'N') {
            whereClauses.push(`watched IN ('${watched}', 'P')`);
        }
        if (mediaWatched === 'Y' || mediaWatched === 'N') {
            whereClauses.push(`primary_media_watched IN ('${mediaWatched}', 'P')`);
        }
        if (minResolution === 'HD') {
            whereClauses.push("primary_media_type IN ('BD4K', 'DL2160', 'BD', 'DL1080', 'DL720')");
        }
        if (minResolution === 'UHD') {
            whereClauses.push("primary_media_type IN ('BD4K', 'DL2160')");
        }

        if (whereClauses.length > 0) {
            sql += ` WHERE (${whereClauses.join(') AND (')})`;
        }

        sql += ' ORDER BY ';

        if (sortPriorityFirst) {
            sql += '(CASE WHEN priority_flag > 0 THEN 1 ELSE 0 END) DESC, ';
        }

        sql += `(
            CASE WHEN UPPER(title) LIKE 'THE %' THEN UPPER(SUBSTR(title, 5))
                 WHEN UPPER(title) LIKE 'AN %' THEN UPPER(SUBSTR(title, 4))
                 WHEN UPPER(title) LIKE 'A %' THEN UPPER(SUBSTR(title, 3))
                 ELSE UPPER(title)
            END
        )`;

        if (limit) {
            sql += ` LIMIT ${limit}`;
        }

        const videos = await this.database?.getAllWithParams<VideoWithId>(sql, params);
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
