/* eslint-disable @typescript-eslint/no-explicit-any */
import { VideoDb, IVideoDb } from '../../../src/services/videodb';
import { LookupTables } from '../../../src/services/videodb/IVideoDb';

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

    const mockDb = {
        initialise: mockInit,
        get: mockGet,
        getAll: mockGetAll,
        exec: mockExec,
        close: mockClose,
        runWithParams: mockRunWithParams
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

            const sql = `INSERT INTO videos
                     (name, category, director, length_mins, to_watch_priority, progress)
                     VALUES
                     ($name, $category, $director, $length_mins, $to_watch_priority, $progress)`;

            const videoParameters = {
                $name: 'some-name',
                $category: 'some-category',
                $director: 'some-director',
                $length_mins: 1234,
                $to_watch_priority: 1,
                $progress: 'some-progress'
            };

            await videoDb.addVideo(video);

            expect(mockRunWithParams).toHaveBeenCalledWith(sql, videoParameters);
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
