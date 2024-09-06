/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotFoundError, NotPermittedError } from '../../../src/errors';
import { VideoDb, IVideoDb } from '../../../src/services/videodb';
import { LookupTables } from '../../../src/services/videodb/IVideoDb';
import { stripWhiteSpace } from '../../../src/utils';

jest.mock('../../../src/adapters');
jest.mock('../../../src/services/videodb/dbUpgradeSql', () => ({
    dbUpgradeSql: ['SQL v1', 'SQL v2', 'SQL v3', 'SQL v4']
}));

const mockStorage = {
    contentFileExists: jest.fn() as jest.Mock,
    getContentDb: jest.fn() as jest.Mock,
};

const versionSql = ['SQL v1', 'SQL v2', 'SQL v3', 'SQL v4'];
const apiPath = 'videos';
const apiDbPath = 'videos/data.db';
const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
} as any;

const regularUser = { id: 'some-user', roles: ['not-admin'] };
const adminUser = { id: 'some-user', roles: ['admin'] };

describe('VideoDb', () => {
    let videoDb: IVideoDb;
    const mockGet = jest.fn();
    const mockGetAll = jest.fn();
    const mockExec = jest.fn();
    const mockInit = jest.fn();
    const mockClose = jest.fn();
    const mockRunWithParams = jest.fn();
    const mockGetWithParams = jest.fn();
    const mockGetAllWithParams = jest.fn();

    const mockDb = {
        initialise: mockInit,
        get: mockGet,
        getAll: mockGetAll,
        exec: mockExec,
        close: mockClose,
        runWithParams: mockRunWithParams,
        getWithParams: mockGetWithParams,
        getAllWithParams: mockGetAllWithParams
    };

    const config = {
        omdbApiKey: 'omdb-key'
    } as any;

    beforeEach(() => {
        mockStorage.getContentDb.mockResolvedValue(mockDb);
        videoDb = new VideoDb(apiPath, config, mockLogger, mockStorage as any);
    });

    describe('initialise', () => {
        it('gets the database with the correct path', async () => {
            mockStorage.contentFileExists.mockReturnValue(false);

            await videoDb.initialise();

            expect(mockStorage.getContentDb).toHaveBeenCalledTimes(1);
            expect(mockStorage.getContentDb).toHaveBeenCalledWith(apiDbPath);
        });

        it('runs all upgrade SQL on a new database, updates but does not attempt to retrieve version', async () => {
            mockStorage.contentFileExists.mockReturnValue(false);

            await videoDb.initialise();

            expect(mockExec).toHaveBeenCalledTimes(5);
            expect(mockExec).toHaveBeenNthCalledWith(1, versionSql[0]);
            expect(mockExec).toHaveBeenNthCalledWith(2, versionSql[1]);
            expect(mockExec).toHaveBeenNthCalledWith(3, versionSql[2]);
            expect(mockExec).toHaveBeenNthCalledWith(4, versionSql[3]);
            expect(mockExec).toHaveBeenNthCalledWith(5, 'UPDATE db_version SET version = 4;');

            expect(mockGet).not.toHaveBeenCalled();
        });

        it('runs partial upgrade SQL on a pre-existing database not at current version', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 2 });

            await videoDb.initialise();

            expect(mockExec).toHaveBeenCalledTimes(3);
            expect(mockExec).toHaveBeenNthCalledWith(1, versionSql[2]);
            expect(mockExec).toHaveBeenNthCalledWith(2, versionSql[3]);
            expect(mockExec).toHaveBeenNthCalledWith(3, 'UPDATE db_version SET version = 4;');
        });

        it('does not run upgrade SQL or store version on a database already at current version', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });

            await videoDb.initialise();

            expect(mockExec).not.toHaveBeenCalled();
        });

        it('does not re-initialise or re-upgrade an already-initialised database', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 3 });

            await videoDb.initialise();
            await videoDb.initialise();

            expect(mockStorage.contentFileExists).toHaveBeenCalledTimes(1);
            expect(mockStorage.getContentDb).toHaveBeenCalledTimes(1);
            expect(mockGet).toHaveBeenCalledTimes(1);
            expect(mockExec).toHaveBeenCalledTimes(2);
        });
    });

    describe('getDbVersion', () => {
        it('returns the retrieved database version', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            await videoDb.initialise();

            const ver = await videoDb.getVersion();

            expect(ver).toBe(4);
        });
    });

    describe('getLookupValues', () => {
        const resultRows = [
            { code: 'code1', description: 'description1' },
            { code: 'code2', description: 'description2' },
            { code: 'code3', description: 'description3' },
        ];

        const expectedReturnVal = {
            'code1': 'description1',
            'code2': 'description2',
            'code3': 'description3'
        };

        beforeEach(async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            await videoDb.initialise();
        });

        it('throws an error if passed an invalid table suffix', async () => {
            await expect(videoDb.getLookupValues('invalid-suffix')).rejects.toThrow('invalid table suffix invalid-suffix');
            expect(mockGetAll).not.toHaveBeenCalled();
        });

        it('attempts to run SQL and returns results the first time it is run', async () => {
            const tableName = Object.values(LookupTables)[0];
            mockGetAll.mockResolvedValue(resultRows);
            const tablePrefix = tableName.replace('l_', '');
            const expectedSql = `SELECT code, description FROM ${tableName}`;

            const values = await videoDb.getLookupValues(tablePrefix);

            expect(mockGetAll).toHaveBeenCalledTimes(1);
            expect(mockGetAll).toHaveBeenCalledWith(expectedSql);
            expect(values).toEqual(expectedReturnVal);
        });

        it('returns the cached results the second time it is run (%s)', async () => {
            const tableName = Object.values(LookupTables)[0];
            mockGetAll.mockResolvedValue(resultRows);
            const tablePrefix = tableName.replace('l_', '');
            const expectedSql = `SELECT code, description FROM ${tableName}`;

            const values = await videoDb.getLookupValues(tablePrefix);
            const values2 = await videoDb.getLookupValues(tablePrefix);

            expect(mockGetAll).toHaveBeenCalledTimes(1);
            expect(mockGetAll).toHaveBeenCalledWith(expectedSql);
            expect(values).toEqual(expectedReturnVal);
            expect(values).toEqual(values2);
        });

        it('throws an error if the lookup table is empty (%s)', async () => {
            const tableName = Object.values(LookupTables)[0];
            mockGetAll.mockResolvedValue(undefined);
            const tablePrefix = tableName.replace('l_', '');

            await expect(videoDb.getLookupValues(tablePrefix)).rejects.toThrow(`No records found in ${tableName}`);
        });
    });

    describe('getOmdbApiKey', () => {
        it('throws error if user is not admin and auth enabled', () => {
            const newConfig = {
                ...config, enableAuthentication: true
            } as any;
            mockStorage.getContentDb.mockResolvedValue(mockDb);
            videoDb = new VideoDb(apiPath, newConfig, mockLogger, mockStorage as any);

            expect(() => videoDb.getOmdbApiKey(regularUser)).toThrow(new NotPermittedError());
        });

        it('does not throw error if user is admin and auth enabled', () => {
            const newConfig = {
                ...config, enableAuthentication: false
            } as any;
            mockStorage.getContentDb.mockResolvedValue(mockDb);
            videoDb = new VideoDb(apiPath, newConfig, mockLogger, mockStorage as any);

            expect(() => videoDb.getOmdbApiKey(regularUser)).not.toThrow();
        });

        it('does not throw error if user is not admin and auth disabled', () => {
            const newConfig = {
                ...config, enableAuthentication: true
            } as any;
            mockStorage.getContentDb.mockResolvedValue(mockDb);
            videoDb = new VideoDb(apiPath, newConfig, mockLogger, mockStorage as any);

            expect(() => videoDb.getOmdbApiKey(adminUser)).not.toThrow();
        });

        it('returns the config api key', () => {
            expect(videoDb.getOmdbApiKey()).toBe('omdb-key');
        });
    });

    describe('getAllTags', () => {
        it('gets and returns a list of tags', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            mockGetAll.mockResolvedValue([{ tag: 'tag1' }, { tag: 'tag2' }]);
            const sql = 'SELECT DISTINCT tag from video_tags ORDER BY tag';

            await videoDb.initialise();

            const tags = await videoDb.getAllTags();

            expect(mockGetAll).toHaveBeenCalledWith(sql);
            expect(tags).toEqual(['tag1', 'tag2']);
        });
    });

    describe('addVideo', () => {
        it('throws error if user is not admin and auth enabled', async () => {
            const newConfig = {
                ...config, enableAuthentication: true
            } as any;
            mockStorage.getContentDb.mockResolvedValue(mockDb);
            videoDb = new VideoDb(apiPath, newConfig, mockLogger, mockStorage as any);

            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            mockGetWithParams.mockResolvedValue({ id: 2468 });

            await videoDb.initialise();

            const video = {
                title: 'some-title',
                category: 'some-category',
                director: 'some-director',
                length_mins: 1234,
                watched: 'Y',
                to_watch_priority: 1,
                progress: 'some-progress',
                imdb_id: 'imdb1234',
                image_url: 'url',
                year: 1923,
                actors: 'some-actors',
                plot: 'stuff happened',
                primary_media_type: 'BD4K',
                primary_media_location: 'MOVW',
                primary_media_watched: 'Y',
                other_media_type: 'BD',
                other_media_location: 'MOVW',
                media_notes: null
            };

            await expect(videoDb.addVideo(video, regularUser)).rejects.toThrow(new NotPermittedError());
        });

        it('does not throw error if user is admin and auth enabled', async () => {
            const newConfig = {
                ...config, enableAuthentication: true
            } as any;
            mockStorage.getContentDb.mockResolvedValue(mockDb);
            videoDb = new VideoDb(apiPath, newConfig, mockLogger, mockStorage as any);

            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            mockGetWithParams.mockResolvedValue({ id: 2468 });

            await videoDb.initialise();

            const video = {
                title: 'some-title',
                category: 'some-category',
                director: 'some-director',
                length_mins: 1234,
                watched: 'Y',
                to_watch_priority: 1,
                progress: 'some-progress',
                imdb_id: 'imdb1234',
                image_url: 'url',
                year: 1923,
                actors: 'some-actors',
                plot: 'stuff happened',
                primary_media_type: 'BD4K',
                primary_media_location: 'MOVW',
                primary_media_watched: 'Y',
                other_media_type: 'BD',
                other_media_location: 'MOVW',
                media_notes: null
            };

            await expect(videoDb.addVideo(video, adminUser)).resolves.toBeDefined();
        });

        it('does not throw error if user is not admin and auth disabled', async () => {
            const newConfig = {
                ...config, enableAuthentication: false
            } as any;
            mockStorage.getContentDb.mockResolvedValue(mockDb);
            videoDb = new VideoDb(apiPath, newConfig, mockLogger, mockStorage as any);

            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            mockGetWithParams.mockResolvedValue({ id: 2468 });

            await videoDb.initialise();

            const video = {
                title: 'some-title',
                category: 'some-category',
                director: 'some-director',
                length_mins: 1234,
                watched: 'Y',
                to_watch_priority: 1,
                progress: 'some-progress',
                imdb_id: 'imdb1234',
                image_url: 'url',
                year: 1923,
                actors: 'some-actors',
                plot: 'stuff happened',
                primary_media_type: 'BD4K',
                primary_media_location: 'MOVW',
                primary_media_watched: 'Y',
                other_media_type: 'BD',
                other_media_location: 'MOVW',
                media_notes: null
            };

            await expect(videoDb.addVideo(video, regularUser)).resolves.toBeDefined();
        });

        it('runs video insert sql with appropriate parameters and returns inserted id', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            mockGetWithParams.mockResolvedValue({ id: 2468 });

            await videoDb.initialise();

            const video = {
                title: 'some-title',
                category: 'some-category',
                director: 'some-director',
                length_mins: 1234,
                watched: 'Y',
                to_watch_priority: 1,
                progress: 'some-progress',
                imdb_id: 'imdb1234',
                image_url: 'url',
                year: 1923,
                actors: 'some-actors',
                plot: 'stuff happened',
                primary_media_type: 'BD4K',
                primary_media_location: 'MOVW',
                primary_media_watched: 'Y',
                other_media_type: 'BD',
                other_media_location: 'MOVW',
                media_notes: null
            };

            const expectedSql = `INSERT INTO videos
                                 (title, category, director, length_mins, watched, to_watch_priority, progress, imdb_id, image_url, year, actors, plot, primary_media_type, primary_media_location, primary_media_watched, other_media_type, other_media_location, media_notes)
                                 VALUES
                                 ($title, $category, $director, $length_mins, $watched, $to_watch_priority, $progress, $imdb_id, $image_url, $year, $actors, $plot, $primary_media_type, $primary_media_location, $primary_media_watched, $other_media_type, $other_media_location, $media_notes)
                                 RETURNING id`;

            const expectedVideoParameters = {
                $title: 'some-title',
                $category: 'some-category',
                $director: 'some-director',
                $length_mins: 1234,
                $watched: 'Y',
                $to_watch_priority: 1,
                $progress: 'some-progress',
                $imdb_id: 'imdb1234',
                $image_url: 'url',
                $year: 1923,
                $actors: 'some-actors',
                $plot: 'stuff happened',
                $primary_media_type: 'BD4K',
                $primary_media_location: 'MOVW',
                $primary_media_watched: 'Y',
                $other_media_type: 'BD',
                $other_media_location: 'MOVW',
                $media_notes: null
            };

            const insertedId = await videoDb.addVideo(video);

            expect(mockGetWithParams).toHaveBeenCalled();
            const [sql, videoParameters] = mockGetWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(videoParameters).toEqual(expectedVideoParameters);
            expect(insertedId).toBe(2468);
        });

        it('deletes but does not insert tags if tags are undefined', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            mockGetWithParams.mockResolvedValue({ id: 2468 });

            await videoDb.initialise();

            const video = {
                title: 'some-title',
                category: 'some-category',
                director: 'some-director',
                length_mins: 1234,
                watched: 'Y',
                to_watch_priority: 1,
                progress: 'some-progress',
                imdb_id: 'imdb1234',
                image_url: 'url',
                year: 1923,
                actors: 'some-actors',
                plot: 'stuff happened',
                primary_media_type: 'BD4K',
                primary_media_location: 'MOVW',
                primary_media_watched: 'Y',
                other_media_type: 'BD',
                other_media_location: 'MOVW',
                media_notes: null
            };

            const expectedTagDeleteSql = 'DELETE FROM video_tags WHERE video_id = 2468';
            await videoDb.addVideo(video);

            expect(mockExec).toHaveBeenCalledWith(expectedTagDeleteSql);
            expect(mockRunWithParams).toHaveBeenCalledTimes(0);
        });

        it('deletes and inserts tags if tags are defined', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            mockGetWithParams.mockResolvedValue({ id: 2468 });

            await videoDb.initialise();

            const video = {
                title: 'some-title',
                category: 'some-category',
                director: 'some-director',
                length_mins: 1234,
                watched: 'Y',
                to_watch_priority: 1,
                progress: 'some-progress',
                tags: ['tag1', 'tag2'],
            };
            const expectedTagInsertParams1 = { '$id': 2468, '$tag': 'tag1' };
            const expectedTagInsertParams2 = { '$id': 2468, '$tag': 'tag2' };

            const expectedTagDeleteSql = 'DELETE FROM video_tags WHERE video_id = 2468';
            const expectedTagInsertSql = 'INSERT INTO video_tags (video_id, tag) VALUES ($id, $tag)';
            await videoDb.addVideo(video as any);

            expect(mockExec).toHaveBeenCalledWith(expectedTagDeleteSql);
            expect(mockRunWithParams).toHaveBeenCalledTimes(2);
            const [tagInsertSql1, tagInsertParams1] = mockRunWithParams.mock.calls[0];
            const [tagInsertSql2, tagInsertParams2] = mockRunWithParams.mock.calls[1];
            expect(stripWhiteSpace(tagInsertSql1)).toBe(stripWhiteSpace(expectedTagInsertSql));
            expect(stripWhiteSpace(tagInsertSql2)).toBe(stripWhiteSpace(expectedTagInsertSql));
            expect(tagInsertParams1).toEqual(expectedTagInsertParams1);
            expect(tagInsertParams2).toEqual(expectedTagInsertParams2);
        });
    });

    describe('updateVideo', () => {
        const video = {
            id: 1,
            title: 'some-title',
            category: 'some-category',
            director: 'some-director',
            length_mins: 1234,
            watched: 'Y',
            to_watch_priority: 1,
            progress: 'some-progress',
            imdb_id: 'imdb1234',
            image_url: 'url',
            year: 1923,
            actors: 'some-actors',
            plot: 'stuff happened',
            primary_media_type: 'BD4K',
            primary_media_location: 'MOVW',
            primary_media_watched: 'Y',
            other_media_type: 'BD',
            other_media_location: 'MOVW',
            media_notes: null
        };

        beforeEach(async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            await videoDb.initialise();
        });

        it('throws error if user is not admin and auth enabled', async () => {
            const newConfig = {
                ...config, enableAuthentication: true
            } as any;
            mockStorage.getContentDb.mockResolvedValue(mockDb);
            videoDb = new VideoDb(apiPath, newConfig, mockLogger, mockStorage as any);

            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            await videoDb.initialise();

            await expect(videoDb.updateVideo(video, regularUser)).rejects.toThrow(new NotPermittedError());
        });

        it('does not throw error if user is admin and auth enabled', async () => {
            const newConfig = {
                ...config, enableAuthentication: true
            } as any;
            mockStorage.getContentDb.mockResolvedValue(mockDb);
            videoDb = new VideoDb(apiPath, newConfig, mockLogger, mockStorage as any);

            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValueOnce({ ver: 4 }).mockResolvedValue({ video_exists: 1 });
            await videoDb.initialise();

            await expect(videoDb.updateVideo(video, adminUser)).resolves.toBeUndefined();
        });

        it('does not throw error if user is not admin and auth disabled', async () => {
            const newConfig = {
                ...config, enableAuthentication: false
            } as any;
            mockStorage.getContentDb.mockResolvedValue(mockDb);
            videoDb = new VideoDb(apiPath, newConfig, mockLogger, mockStorage as any);

            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValueOnce({ ver: 4 }).mockResolvedValue({ video_exists: 1 });
            await videoDb.initialise();

            await expect(videoDb.updateVideo(video, regularUser)).resolves.toBeUndefined();
        });

        it('throws error if video id does not exist', async () => {
            mockGet.mockResolvedValue({ video_exists: 0 });

            await expect(videoDb.updateVideo(video)).rejects.toThrow(new NotFoundError('video id 1 does not exist'));
            expect(mockGet).toHaveBeenCalledWith('SELECT COUNT() AS video_exists FROM videos WHERE id=1');
        });

        it('runs update SQL with correct parameters if video exists', async () => {
            mockGet.mockResolvedValue({ video_exists: 1 });
            const expectedSql = `UPDATE videos
                                 SET title = $title,
                                     category = $category,
                                     director = $director,
                                     length_mins = $length_mins,
                                     watched = $watched,
                                     to_watch_priority = $to_watch_priority,
                                     progress = $progress,
                                     imdb_id = $imdb_id,
                                     image_url = $image_url,
                                     year = $year,
                                     actors = $actors,
                                     plot = $plot,
                                     primary_media_type = $primary_media_type,
                                     primary_media_location = $primary_media_location,
                                     primary_media_watched = $primary_media_watched,
                                     other_media_type = $other_media_type,
                                     other_media_location = $other_media_location,
                                     media_notes = $media_notes
                                 WHERE id = $id`;

            const expectedVideoParameters = {
                $id: 1,
                $title: 'some-title',
                $category: 'some-category',
                $director: 'some-director',
                $length_mins: 1234,
                $watched: 'Y',
                $to_watch_priority: 1,
                $progress: 'some-progress',
                $imdb_id: 'imdb1234',
                $image_url: 'url',
                $year: 1923,
                $actors: 'some-actors',
                $plot: 'stuff happened',
                $primary_media_type: 'BD4K',
                $primary_media_location: 'MOVW',
                $primary_media_watched: 'Y',
                $other_media_type: 'BD',
                $other_media_location: 'MOVW',
                $media_notes: null
            };

            await videoDb.updateVideo(video);

            expect(mockRunWithParams).toHaveBeenCalled();
            const [sql, videoParameters] = mockRunWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(videoParameters).toEqual(expectedVideoParameters);
        });

        it('deletes but does not insert tags if tags are undefined', async () => {
            mockGet.mockResolvedValue({ video_exists: 1 });
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            mockGetWithParams.mockResolvedValue({ id: 2468 });

            await videoDb.initialise();

            const expectedTagDeleteSql = 'DELETE FROM video_tags WHERE video_id = 1';
            await videoDb.updateVideo(video);

            expect(mockExec).toHaveBeenCalledWith(expectedTagDeleteSql);
            expect(mockRunWithParams).toHaveBeenCalledTimes(1); //for the video update
        });

        it('deletes and inserts tags if tags are defined', async () => {
            mockGet.mockResolvedValue({ video_exists: 1 });
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            mockGetWithParams.mockResolvedValue({ id: 2468 });

            await videoDb.initialise();

            const videoWithMedia = {
                id: 1,
                title: 'some-title',
                category: 'some-category',
                director: 'some-director',
                length_mins: 1234,
                watched: 'Y',
                to_watch_priority: 1,
                progress: 'some-progress',
                tags: ['tag1', 'tag2'],
            };
            const expectedTagInsertParams1 = { '$id': 1, '$tag': 'tag1' };
            const expectedTagInsertParams2 = { '$id': 1, '$tag': 'tag2' };

            const expectedTagDeleteSql = 'DELETE FROM video_tags WHERE video_id = 1';
            const expectedTagInsertSql = 'INSERT INTO video_tags (video_id, tag) VALUES ($id, $tag)';
            await videoDb.updateVideo(videoWithMedia as any);

            expect(mockExec).toHaveBeenCalledWith(expectedTagDeleteSql);
            expect(mockRunWithParams).toHaveBeenCalledTimes(3);
            const [tagInsertSql1, tagInsertParams1] = mockRunWithParams.mock.calls[1];
            const [tagInsertSql2, tagInsertParams2] = mockRunWithParams.mock.calls[2];
            expect(stripWhiteSpace(tagInsertSql1)).toBe(stripWhiteSpace(expectedTagInsertSql));
            expect(stripWhiteSpace(tagInsertSql2)).toBe(stripWhiteSpace(expectedTagInsertSql));
            expect(tagInsertParams1).toEqual(expectedTagInsertParams1);
            expect(tagInsertParams2).toEqual(expectedTagInsertParams2);
        });
    });

    describe('getVideo', () => {
        beforeEach(async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            await videoDb.initialise();
        });

        it('throws error if video id does not exist', async () => {
            mockGet.mockResolvedValue({ video_exists: 0 });

            await expect(videoDb.getVideo(12)).rejects.toThrow(new NotFoundError('video id 12 does not exist'));
            expect(mockGet).toHaveBeenCalledWith('SELECT COUNT() AS video_exists FROM videos WHERE id=12');
        });

        it('attempts to get video and tags', async () => {
            mockGet.mockResolvedValueOnce({ video_exists: 1 })
                .mockResolvedValue({ video: 'video' });
            mockGetAll.mockResolvedValue([{ tag: 'tag1' }, { tag: 'tag2' }]);

            const expectedVideoSql = `SELECT id, title, category, director, length_mins, watched, to_watch_priority, progress,
                              imdb_id, image_url, year, actors, plot, primary_media_type, primary_media_location, primary_media_watched, other_media_type, other_media_location, media_notes
                              FROM videos
                              WHERE id = 12`;

            const expectedTagSql = 'SELECT tag FROM video_tags WHERE video_id = 12 ORDER BY tag';
            const video = await videoDb.getVideo(12);

            const actualVideoSql = mockGet.mock.calls[2][0];
            const actualTagSql = mockGetAll.mock.calls[0][0];
            expect(stripWhiteSpace(actualVideoSql)).toBe(stripWhiteSpace(expectedVideoSql));
            expect(stripWhiteSpace(actualTagSql)).toBe(stripWhiteSpace(expectedTagSql));
            expect(video).toEqual({ video: 'video', tags: ['tag1', 'tag2'] });
        });
    });

    describe('updateVideos', () => {
        beforeEach(async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            await videoDb.initialise();
        });

        it('throws error if user is not admin and auth enabled', async () => {
            const newConfig = {
                ...config, enableAuthentication: true
            } as any;
            mockStorage.getContentDb.mockResolvedValue(mockDb);
            videoDb = new VideoDb(apiPath, newConfig, mockLogger, mockStorage as any);

            expect(() => videoDb.updateVideos([], regularUser)).rejects.toThrow(new NotPermittedError());
        });

        it.each([0, 1])('attempts to update priorties when all priorities are set to %s', async (value: number) => {
            mockGet.mockResolvedValue({ video_exists: 1 });

            const expectedSql = `UPDATE videos
                                 SET to_watch_priority = ${value}
                                 WHERE id IN (1,2,3,4)`;

            await videoDb.updateVideos([
                { id: 1, to_watch_priority: value as 0|1},
                { id: 3, to_watch_priority: value as 0|1},
                { id: 4, to_watch_priority: value as 0|1},
                { id: 2, to_watch_priority: value as 0|1},
            ]);

            expect(mockExec).toHaveBeenCalledTimes(1);
            const actualSql = mockExec.mock.calls[0][0];

            expect(stripWhiteSpace(actualSql)).toBe(stripWhiteSpace(expectedSql));
        });

        it('attempts to update priorties when priorities are set to both 0 and 1', async () => {
            mockGet.mockResolvedValue({ video_exists: 1 });

            const expectedSql0 = `UPDATE videos
                                  SET to_watch_priority = 0
                                  WHERE id IN (1,2,3,4)`;
            const expectedSql1 = `UPDATE videos
                                  SET to_watch_priority = 1
                                  WHERE id IN (5,6,7,8)`;

            await videoDb.updateVideos([
                { id: 1, to_watch_priority: 0},
                { id: 8, to_watch_priority: 1},
                { id: 7, to_watch_priority: 1},
                { id: 3, to_watch_priority: 0},
                { id: 5, to_watch_priority: 1},
                { id: 2, to_watch_priority: 0},
                { id: 6, to_watch_priority: 1},
                { id: 4, to_watch_priority: 0},
            ]);

            expect(mockExec).toHaveBeenCalledTimes(2);
            const actualSql0 = mockExec.mock.calls[0][0];
            const actualSql1 = mockExec.mock.calls[1][0];

            expect(stripWhiteSpace(actualSql0)).toBe(stripWhiteSpace(expectedSql0));
            expect(stripWhiteSpace(actualSql1)).toBe(stripWhiteSpace(expectedSql1));
        });
    });

    describe('deleteVideo', () => {
        beforeEach(async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            await videoDb.initialise();
        });

        it('throws error if user is not admin and auth enabled', async () => {
            const newConfig = {
                ...config, enableAuthentication: true
            } as any;
            mockStorage.getContentDb.mockResolvedValue(mockDb);
            videoDb = new VideoDb(apiPath, newConfig, mockLogger, mockStorage as any);

            expect(() => videoDb.deleteVideo(123, regularUser)).rejects.toThrow(new NotPermittedError());
        });

        it('throws error if video id does not exist', async () => {
            mockGet.mockResolvedValue({ video_exists: 0 });

            await expect(videoDb.deleteVideo(12)).rejects.toThrow(new NotFoundError('video id 12 does not exist'));
            expect(mockGet).toHaveBeenCalledWith('SELECT COUNT() AS video_exists FROM videos WHERE id=12');
        });

        it('attempts to delete video', async () => {
            mockGet.mockResolvedValue({ video_exists: 1 });

            const expectedTagDeleteSql = 'DELETE FROM video_tags WHERE video_id = 12';
            const expectedVideoDeleteSql = 'DELETE FROM videos WHERE id = 12';

            await videoDb.deleteVideo(12);

            expect(mockExec).toHaveBeenCalledTimes(2);
            const actualTagDeleteSql = mockExec.mock.calls[0][0];
            const actualVideoDeleteSql = mockExec.mock.calls[1][0];

            expect(stripWhiteSpace(actualTagDeleteSql)).toBe(stripWhiteSpace(expectedTagDeleteSql));
            expect(stripWhiteSpace(actualVideoDeleteSql)).toBe(stripWhiteSpace(expectedVideoDeleteSql));
        });
    });

    describe('queryVideos', () => {
        const baseSql = `SELECT v.id, v.title, v.category, v.director, v.length_mins, v.watched, v.to_watch_priority, v.progress, v.year, v.actors,
                                v.primary_media_type, v.primary_media_location, v.primary_media_watched, v.other_media_type, v.other_media_location, v.media_notes,
                                vt.tags
                         FROM   videos v
                        LEFT OUTER JOIN (
                            SELECT video_id, GROUP_CONCAT(tag) AS tags
                            FROM video_tags
                            GROUP BY video_id ) vt
                        ON v.id =  vt.video_id`;
        const orderBySQL = ` ORDER BY (
            CASE WHEN UPPER(title) LIKE 'THE %' THEN SUBSTR(title, 5)
                 WHEN UPPER(title) LIKE 'AN %' THEN SUBSTR(title, 4)
                 WHEN UPPER(title) LIKE 'A %' THEN SUBSTR(title, 3)
                 ELSE title
            END
        )`;

        it('runs the correct sql to retrieve all videos when no filter params are defined', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValueOnce({ ver: 4 });
            await videoDb.initialise();
            const expectedSql = baseSql + orderBySQL;

            mockGetAllWithParams.mockResolvedValue('videos');
            const videos = await videoDb.queryVideos();

            expect(mockGetAllWithParams).toHaveBeenCalled();
            const [sql, params] = mockGetAllWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(params).toEqual({});
            expect(videos).toBe('videos');
        });

        it('runs the correct sql to retrieve all videos when empty filter params object is defined', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValueOnce({ ver: 4 });
            await videoDb.initialise();
            const expectedSql = baseSql + orderBySQL;

            mockGetAllWithParams.mockResolvedValue('videos');
            const videos = await videoDb.queryVideos({});

            expect(mockGetAllWithParams).toHaveBeenCalled();
            const [sql, params] = mockGetAllWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(params).toEqual({});
            expect(videos).toBe('videos');
        });

        it('runs the correct sql with filter params when maxLength filter param is defined', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValueOnce({ ver: 4 });
            await videoDb.initialise();
            const expectedSql = baseSql + ' WHERE (length_mins <= $maxLength)' + orderBySQL;
            const expectedParams = { '$maxLength': 3 };

            mockGetAllWithParams.mockResolvedValue('videos');
            const videos = await videoDb.queryVideos({ maxLength: 3 });

            expect(mockGetAllWithParams).toHaveBeenCalled();
            const [sql, params] = mockGetAllWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(params).toEqual(expectedParams);
            expect(videos).toBe('videos');
        });

        it('runs the correct sql with filter params when categories filter param is defined', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValueOnce({ ver: 4 });
            await videoDb.initialise();
            const expectedSql = baseSql + ' WHERE (category IN ($category0, $category1, $category2))' + orderBySQL;
            const expectedParams = { '$category0': 'MOV', '$category1': 'TV', '$category2': 'TVDOC' };

            mockGetAllWithParams.mockResolvedValue('videos');
            const videos = await videoDb.queryVideos({ categories: ['MOV','TV','TVDOC'] });

            expect(mockGetAllWithParams).toHaveBeenCalled();
            const [sql, params] = mockGetAllWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(params).toEqual(expectedParams);
            expect(videos).toBe('videos');
        });

        it('runs the correct sql with filter params when watchedStatuses filter param is defined', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValueOnce({ ver: 4 });
            await videoDb.initialise();
            const expectedSql = baseSql + ' WHERE (watched IN ($watchedStatus0, $watchedStatus1, $watchedStatus2))' + orderBySQL;
            const expectedParams = { '$watchedStatus0': 'Y', '$watchedStatus1': 'N', '$watchedStatus2': 'P' };

            mockGetAllWithParams.mockResolvedValue('videos');
            const videos = await videoDb.queryVideos({ watchedStatuses: ['Y','N','P'] });

            expect(mockGetAllWithParams).toHaveBeenCalled();
            const [sql, params] = mockGetAllWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(params).toEqual(expectedParams);
            expect(videos).toBe('videos');
        });

        it('runs the correct sql with filter params when pmWatchedStatuses filter param is defined', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValueOnce({ ver: 4 });
            await videoDb.initialise();
            const expectedSql = baseSql + ' WHERE (primary_media_watched IN ($pmWatchedStatus0, $pmWatchedStatus1, $pmWatchedStatus2))' + orderBySQL;
            const expectedParams = { '$pmWatchedStatus0': 'Y', '$pmWatchedStatus1': 'N', '$pmWatchedStatus2': 'P' };

            mockGetAllWithParams.mockResolvedValue('videos');
            const videos = await videoDb.queryVideos({ pmWatchedStatuses: ['Y','N','P'] });

            expect(mockGetAllWithParams).toHaveBeenCalled();
            const [sql, params] = mockGetAllWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(params).toEqual(expectedParams);
            expect(videos).toBe('videos');
        });

        it('runs the correct sql with filter params when primaryMediaTypes filter param is defined', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValueOnce({ ver: 4 });
            await videoDb.initialise();
            const expectedSql = baseSql + ' WHERE (primary_media_type IN ($pmType0, $pmType1, $pmType2))' + orderBySQL;
            const expectedParams = { '$pmType0': 'BD', '$pmType1': 'BD4K', '$pmType2': 'DL1080' };

            mockGetAllWithParams.mockResolvedValue('videos');
            const videos = await videoDb.queryVideos({ primaryMediaTypes: ['BD','BD4K','DL1080'] });

            expect(mockGetAllWithParams).toHaveBeenCalled();
            const [sql, params] = mockGetAllWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(params).toEqual(expectedParams);
            expect(videos).toBe('videos');
        });

        it('runs the correct sql with filter params when tags filter param is defined', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValueOnce({ ver: 4 });
            await videoDb.initialise();
            const expectedSql = baseSql + ' WHERE (EXISTS (SELECT 1 FROM video_tags WHERE video_id = id AND tag IN ($tag0, $tag1, $tag2)))' + orderBySQL;
            const expectedParams = { '$tag0': 'tag0', '$tag1': 'tag1', '$tag2': 'tag2' };

            mockGetAllWithParams.mockResolvedValue('videos');
            const videos = await videoDb.queryVideos({ tags: ['tag0','tag1','tag2'] });

            expect(mockGetAllWithParams).toHaveBeenCalled();
            const [sql, params] = mockGetAllWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(params).toEqual(expectedParams);
            expect(videos).toBe('videos');
        });

        it('runs the correct sql with filter params when titleContains filter param is defined', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValueOnce({ ver: 4 });
            await videoDb.initialise();
            const expectedSql = baseSql + ' WHERE (LOWER(title) LIKE $titleContains)' + orderBySQL;
            const expectedParams = { '$titleContains': '%sometitle%' };

            mockGetAllWithParams.mockResolvedValue('videos');
            const videos = await videoDb.queryVideos({ titleContains: 'sOmeTiTle'});

            expect(mockGetAllWithParams).toHaveBeenCalled();
            const [sql, params] = mockGetAllWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(params).toEqual(expectedParams);
            expect(videos).toBe('videos');
        });

        it('runs the correct sql with filter params when limit param is defined', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValueOnce({ ver: 4 });
            await videoDb.initialise();
            const expectedSql = baseSql + orderBySQL + ' LIMIT 100';
            const expectedParams = { };

            mockGetAllWithParams.mockResolvedValue('videos');
            const videos = await videoDb.queryVideos({}, 100);

            expect(mockGetAllWithParams).toHaveBeenCalled();
            const [sql, params] = mockGetAllWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(params).toEqual(expectedParams);
            expect(videos).toBe('videos');
        });

        it('runs the correct sql with filter params when titleContains, categories, tags, watchedStatuses, pmWatchedStatuses, primaryMediaTypes and maxLength filter param are all defined', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValueOnce({ ver: 4 });
            await videoDb.initialise();
            const expectedSql = baseSql + ` WHERE (length_mins <= $maxLength)
                                            AND (category IN ($category0, $category1, $category2))
                                            AND (EXISTS (SELECT 1 FROM video_tags WHERE video_id = id AND tag IN ($tag0, $tag1, $tag2)))
                                            AND (LOWER(title) LIKE $titleContains)
                                            AND (watched IN ($watchedStatus0, $watchedStatus1, $watchedStatus2))
                                            AND (primary_media_watched IN ($pmWatchedStatus0, $pmWatchedStatus1, $pmWatchedStatus2))
                                            AND (primary_media_type IN ($pmType0, $pmType1, $pmType2))` + orderBySQL;
            const expectedParams = {
                '$titleContains': '%title%',
                '$category0': 'MOV', '$category1': 'TV', '$category2': 'TVDOC',
                '$watchedStatus0': 'Y', '$watchedStatus1': 'N', '$watchedStatus2': 'P',
                '$pmWatchedStatus0': 'Y', '$pmWatchedStatus1': 'N', '$pmWatchedStatus2': 'P',
                '$pmType0': 'BD', '$pmType1': 'BD4K', '$pmType2': 'DL1080',
                '$tag0': 'tag0', '$tag1': 'tag1', '$tag2': 'tag2',
                '$maxLength': 120
            };

            mockGetAllWithParams.mockResolvedValue('videos');
            const videos = await videoDb.queryVideos({
                titleContains: 'title', maxLength: 120,
                categories: ['MOV', 'TV', 'TVDOC'],
                tags: ['tag0', 'tag1', 'tag2'],
                watchedStatuses: ['Y', 'N', 'P'],
                pmWatchedStatuses: ['Y', 'N', 'P'],
                primaryMediaTypes: ['BD', 'BD4K', 'DL1080'],
            });

            expect(mockGetAllWithParams).toHaveBeenCalled();
            const [sql, params] = mockGetAllWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(params).toEqual(expectedParams);
            expect(videos).toBe('videos');
        });
    });

    describe('shutdown', () => {
        it('closes the database', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            await videoDb.initialise();

            await videoDb.shutdown();

            expect(mockClose).toHaveBeenCalledTimes(1);
        });
    });
});
