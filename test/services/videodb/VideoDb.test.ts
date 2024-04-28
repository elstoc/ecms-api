/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotFoundError } from '../../../src/errors';
import { VideoDb, IVideoDb } from '../../../src/services/videodb';
import { LookupTables } from '../../../src/services/videodb/IVideoDb';
import { stripWhiteSpace } from '../../../src/utils';

jest.mock('../../../src/adapters');
jest.mock('../../../src/services/videodb/dbVersionSql', () => ({
    dbVersionSql: ['SQL v1', 'SQL v2', 'SQL v3', 'SQL v4']
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

describe('VideoDb', () => {
    let videoDb: IVideoDb;
    const mockGet = jest.fn();
    const mockGetAll = jest.fn();
    const mockExec = jest.fn();
    const mockInit = jest.fn();
    const mockClose = jest.fn();
    const mockRunWithParams = jest.fn();
    const mockGetAllWithParams = jest.fn();

    const mockDb = {
        initialise: mockInit,
        get: mockGet,
        getAll: mockGetAll,
        exec: mockExec,
        close: mockClose,
        runWithParams: mockRunWithParams,
        getAllWithParams: mockGetAllWithParams
    };

    beforeEach(() => {
        mockStorage.getContentDb.mockResolvedValue(mockDb);
        videoDb = new VideoDb(apiPath, mockLogger, mockStorage as any);
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

    describe('addVideo', () => {
        it('runs sql with appropriate parameters', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });

            await videoDb.initialise();

            const video = {
                name: 'some-name',
                category: 'some-category',
                director: 'some-director',
                length_mins: 1234,
                to_watch_priority: 1,
                progress: 'some-progress'
            };

            const expectedSql = `INSERT INTO videos
                                 (name, category, director, length_mins, to_watch_priority, progress)
                                 VALUES
                                 ($name, $category, $director, $length_mins, $to_watch_priority, $progress)`;

            const expectedVideoParameters = {
                $name: 'some-name',
                $category: 'some-category',
                $director: 'some-director',
                $length_mins: 1234,
                $to_watch_priority: 1,
                $progress: 'some-progress'
            };

            await videoDb.addVideo(video);

            expect(mockRunWithParams).toHaveBeenCalled();
            const [sql, videoParameters] = mockRunWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(videoParameters).toEqual(expectedVideoParameters);
        });
    });

    describe('updateVideo', () => {
        const video = {
            id: 1,
            name: 'some-name',
            category: 'some-category',
            director: 'some-director',
            length_mins: 1234,
            to_watch_priority: 1,
            progress: 'some-progress'
        };

        beforeEach(async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            await videoDb.initialise();
        });

        it('throws error if video id does not exist', async () => {
            mockGet.mockResolvedValue({ video_exists: 0 });

            await expect(videoDb.updateVideo(video)).rejects.toThrow(new NotFoundError('video id 1 does not exist'));
            expect(mockGet).toHaveBeenCalledWith('SELECT COUNT() AS video_exists FROM videos WHERE id=1');
        });

        it('runs update SQL with correct parameters if video exists', async () => {
            mockGet.mockResolvedValue({ video_exists: 1 });
            const expectedSql = `UPDATE videos
                                 SET name = $name,
                                     category = $category,
                                     director = $director,
                                     length_mins = $length_mins,
                                     to_watch_priority = $to_watch_priority,
                                     progress = $progress
                                 WHERE id = $id`;

            const expectedVideoParameters = {
                $id: 1,
                $name: 'some-name',
                $category: 'some-category',
                $director: 'some-director',
                $length_mins: 1234,
                $to_watch_priority: 1,
                $progress: 'some-progress'
            };

            await videoDb.updateVideo(video);

            expect(mockRunWithParams).toHaveBeenCalled();
            const [sql, videoParameters] = mockRunWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(videoParameters).toEqual(expectedVideoParameters);
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

        it('attempts to get video', async () => {
            mockGet.mockResolvedValueOnce({ video_exists: 1 })
                .mockResolvedValue('video');

            const sql = 'SELECT id, name, category, director, length_mins, to_watch_priority, progress FROM videos WHERE id = 12';

            const video = await videoDb.getVideo(12);

            expect(mockGet).toHaveBeenCalledWith(sql);
            expect(video).toBe('video');
        });
    });

    describe('queryVideos', () => {
        it('runs the correct sql to retrieve all videos when no query params are defined', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValueOnce({ ver: 4 });
            await videoDb.initialise();
            const expectedSql = 'SELECT id, name, category, director, length_mins, to_watch_priority, progress FROM videos';

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
            const expectedSql = 'SELECT id, name, category, director, length_mins, to_watch_priority, progress FROM videos';

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
            const expectedSql = 'SELECT id, name, category, director, length_mins, to_watch_priority, progress FROM videos WHERE (length_mins <= $maxLength)';
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
            const expectedSql = 'SELECT id, name, category, director, length_mins, to_watch_priority, progress FROM videos WHERE (category IN ($category0, $category1, $category2))';
            const expectedParams = { '$category0': 'MOV', '$category1': 'TV', '$category2': 'TVDOC' };

            mockGetAllWithParams.mockResolvedValue('videos');
            const videos = await videoDb.queryVideos({ categories: ['MOV','TV','TVDOC'] });

            expect(mockGetAllWithParams).toHaveBeenCalled();
            const [sql, params] = mockGetAllWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(params).toEqual(expectedParams);
            expect(videos).toBe('videos');
        });

        it('runs the correct sql with query params when titleLike query param is defined', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValueOnce({ ver: 4 });
            await videoDb.initialise();
            const expectedSql = 'SELECT id, name, category, director, length_mins, to_watch_priority, progress FROM videos WHERE (LOWER(name) LIKE $titleLike)';
            const expectedParams = { '$titleLike': '%sometitle%' };

            mockGetAllWithParams.mockResolvedValue('videos');
            const videos = await videoDb.queryVideos({ titleLike: '%sOmeTiTle%'});

            expect(mockGetAllWithParams).toHaveBeenCalled();
            const [sql, params] = mockGetAllWithParams.mock.calls[0];
            expect(stripWhiteSpace(sql)).toBe(stripWhiteSpace(expectedSql));
            expect(params).toEqual(expectedParams);
            expect(videos).toBe('videos');
        });

        it('runs the correct sql with query params when titleLike, categories and maxLength query param are both defined', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValueOnce({ ver: 4 });
            await videoDb.initialise();
            const expectedSql = `SELECT id, name, category, director, length_mins, to_watch_priority, progress
                                 FROM videos
                                 WHERE (length_mins <= $maxLength)
                                 AND (category IN ($category0, $category1, $category2))
                                 AND (LOWER(name) LIKE $titleLike)`;
            const expectedParams = {
                '$titleLike': '%title%',
                '$category0': 'MOV', '$category1': 'TV', '$category2': 'TVDOC',
                '$maxLength': 120
            };

            mockGetAllWithParams.mockResolvedValue('videos');
            const videos = await videoDb.queryVideos({ titleLike: '%title%', maxLength: 120, categories: ['MOV','TV','TVDOC'] });

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
