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
            };

            const expectedSql = `INSERT INTO videos
                                 (title, category, director, length_mins, watched, to_watch_priority, progress, imdb_id, image_url, year, actors, plot)
                                 VALUES
                                 ($title, $category, $director, $length_mins, $watched, $to_watch_priority, $progress, $imdb_id, $image_url, $year, $actors, $plot)
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
            };

            const insertedId = await videoDb.addVideo(video);

            expect(mockGetWithParams).toHaveBeenCalled();
            const [sql, videoParameters] = mockGetWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(videoParameters).toEqual(expectedVideoParameters);
            expect(insertedId).toBe(2468);
        });

        it('deletes but does not insert media/tags if media/tags are undefined', async () => {
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
            };

            const expectedMediaDeleteSql = 'DELETE FROM video_media WHERE video_id = 2468';
            const expectedTagDeleteSql = 'DELETE FROM video_tags WHERE video_id = 2468';
            await videoDb.addVideo(video);

            expect(mockExec).toHaveBeenCalledWith(expectedMediaDeleteSql);
            expect(mockExec).toHaveBeenCalledWith(expectedTagDeleteSql);
            expect(mockRunWithParams).toHaveBeenCalledTimes(0);
        });

        it('deletes and inserts media/tags if media/tags are defined', async () => {
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
                media: [
                    {
                      media_type: 'DL2160',
                      media_location: 'NAS',
                      watched: 'N',
                      notes: null
                    },
                    {
                      media_type: 'DVDR1',
                      media_location: 'MOVW',
                      watched: 'Y',
                      notes: null
                    }
                  ]
            };
            const expectedMediaInsertSql = `INSERT INTO video_media (video_id, media_type, media_location, watched, notes)
                            VALUES ($id, $media_type, $media_location, $watched, $notes)`;
            const expectedMediaInsertParams1 = {
                '$id': 2468,
                '$media_type': 'DL2160',
                '$media_location': 'NAS',
                '$watched': 'N',
                '$notes': null
            };
            const expectedMediaInsertParams2 = {
                '$id': 2468,
                '$media_type': 'DVDR1',
                '$media_location': 'MOVW',
                '$watched': 'Y',
                '$notes': null
            };
            const expectedTagInsertParams1 = { '$id': 2468, '$tag': 'tag1' };
            const expectedTagInsertParams2 = { '$id': 2468, '$tag': 'tag2' };

            const expectedMediaDeleteSql = 'DELETE FROM video_media WHERE video_id = 2468';
            const expectedTagDeleteSql = 'DELETE FROM video_tags WHERE video_id = 2468';
            const expectedTagInsertSql = 'INSERT INTO video_tags (video_id, tag) VALUES ($id, $tag)';
            await videoDb.addVideo(video as any);

            expect(mockExec).toHaveBeenCalledWith(expectedMediaDeleteSql);
            expect(mockExec).toHaveBeenCalledWith(expectedTagDeleteSql);
            expect(mockRunWithParams).toHaveBeenCalledTimes(4);
            const [mediaInsertSql1, mediaInsertParams1] = mockRunWithParams.mock.calls[0];
            const [mediaInsertSql2, mediaInsertParams2] = mockRunWithParams.mock.calls[1];
            const [tagInsertSql1, tagInsertParams1] = mockRunWithParams.mock.calls[2];
            const [tagInsertSql2, tagInsertParams2] = mockRunWithParams.mock.calls[3];
            expect(stripWhiteSpace(mediaInsertSql1)).toBe(stripWhiteSpace(expectedMediaInsertSql));
            expect(stripWhiteSpace(mediaInsertSql2)).toBe(stripWhiteSpace(expectedMediaInsertSql));
            expect(stripWhiteSpace(tagInsertSql1)).toBe(stripWhiteSpace(expectedTagInsertSql));
            expect(stripWhiteSpace(tagInsertSql2)).toBe(stripWhiteSpace(expectedTagInsertSql));
            expect(mediaInsertParams1).toEqual(expectedMediaInsertParams1);
            expect(mediaInsertParams2).toEqual(expectedMediaInsertParams2);
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
                                     plot = $plot
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
            };

            await videoDb.updateVideo(video);

            expect(mockRunWithParams).toHaveBeenCalled();
            const [sql, videoParameters] = mockRunWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(videoParameters).toEqual(expectedVideoParameters);
        });

        it('deletes but does not insert media/tags if media/tags are undefined', async () => {
            mockGet.mockResolvedValue({ video_exists: 1 });
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            mockGetWithParams.mockResolvedValue({ id: 2468 });

            await videoDb.initialise();

            const expectedMediaDeleteSql = 'DELETE FROM video_media WHERE video_id = 1';
            const expectedTagDeleteSql = 'DELETE FROM video_tags WHERE video_id = 1';
            await videoDb.updateVideo(video);

            expect(mockExec).toHaveBeenCalledWith(expectedMediaDeleteSql);
            expect(mockExec).toHaveBeenCalledWith(expectedTagDeleteSql);
            expect(mockRunWithParams).toHaveBeenCalledTimes(1); //for the video update
        });

        it('deletes and inserts media/tags if media/tags are defined', async () => {
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
                media: [
                    {
                      media_type: 'DL2160',
                      media_location: 'NAS',
                      watched: 'N',
                      notes: null
                    },
                    {
                      media_type: 'DVDR1',
                      media_location: 'MOVW',
                      watched: 'Y',
                      notes: null
                    }
                  ]
            };
            const expectedMediaInsertSql = `INSERT INTO video_media (video_id, media_type, media_location, watched, notes)
                            VALUES ($id, $media_type, $media_location, $watched, $notes)`;
            const expectedMediaInsertParams1 = {
                '$id': 1,
                '$media_type': 'DL2160',
                '$media_location': 'NAS',
                '$watched': 'N',
                '$notes': null
            };
            const expectedMediaInsertParams2 = {
                '$id': 1,
                '$media_type': 'DVDR1',
                '$media_location': 'MOVW',
                '$watched': 'Y',
                '$notes': null
            };
            const expectedTagInsertParams1 = { '$id': 1, '$tag': 'tag1' };
            const expectedTagInsertParams2 = { '$id': 1, '$tag': 'tag2' };

            const expectedMediaDeleteSql = 'DELETE FROM video_media WHERE video_id = 1';
            const expectedTagDeleteSql = 'DELETE FROM video_tags WHERE video_id = 1';
            const expectedTagInsertSql = 'INSERT INTO video_tags (video_id, tag) VALUES ($id, $tag)';
            await videoDb.updateVideo(videoWithMedia as any);

            expect(mockExec).toHaveBeenCalledWith(expectedMediaDeleteSql);
            expect(mockExec).toHaveBeenCalledWith(expectedTagDeleteSql);
            expect(mockRunWithParams).toHaveBeenCalledTimes(5);
            const [mediaInsertSql1, mediaInsertParams1] = mockRunWithParams.mock.calls[1];
            const [mediaInsertSql2, mediaInsertParams2] = mockRunWithParams.mock.calls[2];
            const [tagInsertSql1, tagInsertParams1] = mockRunWithParams.mock.calls[3];
            const [tagInsertSql2, tagInsertParams2] = mockRunWithParams.mock.calls[4];
            expect(stripWhiteSpace(mediaInsertSql1)).toBe(stripWhiteSpace(expectedMediaInsertSql));
            expect(stripWhiteSpace(mediaInsertSql2)).toBe(stripWhiteSpace(expectedMediaInsertSql));
            expect(stripWhiteSpace(tagInsertSql1)).toBe(stripWhiteSpace(expectedTagInsertSql));
            expect(stripWhiteSpace(tagInsertSql2)).toBe(stripWhiteSpace(expectedTagInsertSql));
            expect(mediaInsertParams1).toEqual(expectedMediaInsertParams1);
            expect(mediaInsertParams2).toEqual(expectedMediaInsertParams2);
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

        it('attempts to get video, tags and media', async () => {
            mockGet.mockResolvedValueOnce({ video_exists: 1 })
                .mockResolvedValue({ video: 'video' });
            mockGetAll.mockResolvedValueOnce('media').mockResolvedValue([{ tag: 'tag1' }, { tag: 'tag2' }]);

            const expectedVideoSql = `SELECT id, title, category, director, length_mins, watched, to_watch_priority, progress, imdb_id, image_url, year, actors, plot
                              FROM videos
                              WHERE id = 12`;

            const expectedMediaSql = `SELECT media_type, media_location, watched, notes
                              FROM video_media
                              INNER JOIN l_media_types
                              ON video_media.media_type = l_media_types.code
                              WHERE video_id = 12
                              ORDER BY priority`;

            const expectedTagSql = 'SELECT tag FROM video_tags WHERE video_id = 12 ORDER BY tag';
            const video = await videoDb.getVideo(12);

            const actualVideoSql = mockGet.mock.calls[2][0];
            const actualMediaSql = mockGetAll.mock.calls[0][0];
            const actualTagSql = mockGetAll.mock.calls[1][0];
            expect(stripWhiteSpace(actualVideoSql)).toBe(stripWhiteSpace(expectedVideoSql));
            expect(stripWhiteSpace(actualMediaSql)).toBe(stripWhiteSpace(expectedMediaSql));
            expect(stripWhiteSpace(actualTagSql)).toBe(stripWhiteSpace(expectedTagSql));
            expect(video).toEqual({ video: 'video', media: 'media', tags: ['tag1', 'tag2'] });
        });
    });

    describe('queryVideos', () => {
        const baseSql = `SELECT v.id, v.title, v.category, v.director, v.length_mins, v.watched, v.to_watch_priority, v.progress, v.year, v.actors,
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
        const orderBySQL = ` ORDER BY (
            CASE WHEN UPPER(title) LIKE 'THE %' THEN SUBSTR(title, 5)
                 WHEN UPPER(title) LIKE 'AN %' THEN SUBSTR(title, 4)
                 WHEN UPPER(title) LIKE 'A %' THEN SUBSTR(title, 3)
                 ELSE title
            END
        )`;

        it('runs the correct sql to retrieve all videos when no query params are defined', async () => {
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

        it('runs the correct sql to retrieve all videos when empty query params object is defined', async () => {
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

        it('runs the correct sql with query params when maxLength query param is defined', async () => {
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

        it('runs the correct sql with query params when categories query param is defined', async () => {
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

        it('runs the correct sql with query params when tags query param is defined', async () => {
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

        it('runs the correct sql with query params when titleContains query param is defined', async () => {
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

        it('runs the correct sql with query params when titleContains, categories, tags and maxLength query param are all defined', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValueOnce({ ver: 4 });
            await videoDb.initialise();
            const expectedSql = baseSql + ` WHERE (length_mins <= $maxLength)
                                            AND (category IN ($category0, $category1, $category2))
                                            AND (EXISTS (SELECT 1 FROM video_tags WHERE video_id = id AND tag IN ($tag0, $tag1, $tag2)))
                                            AND (LOWER(title) LIKE $titleContains)` + orderBySQL;
            const expectedParams = {
                '$titleContains': '%title%',
                '$category0': 'MOV', '$category1': 'TV', '$category2': 'TVDOC',
                '$tag0': 'tag0', '$tag1': 'tag1', '$tag2': 'tag2',
                '$maxLength': 120
            };

            mockGetAllWithParams.mockResolvedValue('videos');
            const videos = await videoDb.queryVideos({ titleContains: 'title', maxLength: 120, categories: ['MOV','TV','TVDOC'], tags: ['tag0','tag1','tag2'] });

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
