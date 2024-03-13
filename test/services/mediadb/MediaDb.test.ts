/* eslint-disable @typescript-eslint/no-explicit-any */
import { MediaDb, IMediaDb } from '../../../src/services/mediadb';
import { Config } from '../../../src/utils';
import { SQLiteDatabaseAdapter } from '../../../src/adapters';
const mockSQLiteDatabaseAdapter = jest.mocked(SQLiteDatabaseAdapter);

jest.mock('../../../src/adapters');
jest.mock('../../../src/services/mediadb/dbVersionSql', () => ({
    dbVersionSql: ['SQL v1', 'SQL v2', 'SQL v3', 'SQL v4']
}));

const mockStorage = {
    contentFileExists: jest.fn() as jest.Mock,
    getContentFullPath: jest.fn() as jest.Mock,
    storeContentFile: jest.fn() as jest.Mock,
};

const versionSql = ['SQL v1', 'SQL v2', 'SQL v3', 'SQL v4'];
const apiPath = 'videos';
const apiDbPath = 'videos/data.db';
const dbFullPath = '/path/to/content/videos/data.db';
const emptyBuffer = Buffer.from('');
const config = {} as Config;

describe('MediaDb', () => {
    let mediaDb: IMediaDb;
    const mockGet = jest.fn();
    const mockExec = jest.fn();
    const mockInit = jest.fn();
    const mockClose = jest.fn();

    beforeEach(() => {
        mediaDb = new MediaDb(apiPath, config, mockStorage as any);
        mockSQLiteDatabaseAdapter.mockClear();
        mockSQLiteDatabaseAdapter.mockImplementation(() => ({
            initialise: mockInit,
            get: mockGet,
            exec: mockExec,
            close: mockClose,
        } as any));
        mockStorage.getContentFullPath.mockReturnValue(dbFullPath);
    });

    describe('initialise', () => {
        it('attempts to create an empty file if no db exists (so that permissions are set)', async () => {
            mockStorage.contentFileExists.mockReturnValue(false);

            await mediaDb.initialise();

            expect(mockStorage.contentFileExists).toHaveBeenCalledWith(apiDbPath);
            expect(mockStorage.storeContentFile).toHaveBeenCalledWith(apiDbPath, emptyBuffer);
        });

        it('does not attempt to create an empty file if db already exists', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });

            await mediaDb.initialise();

            expect(mockStorage.contentFileExists).toHaveBeenCalledWith(apiDbPath);
            expect(mockStorage.storeContentFile).not.toHaveBeenCalled();
        });

        it('initialises the database with the correct path', async () => {
            mockStorage.contentFileExists.mockReturnValue(false);

            await mediaDb.initialise();

            expect(mockSQLiteDatabaseAdapter).toHaveBeenCalledTimes(1);
            expect(mockSQLiteDatabaseAdapter).toHaveBeenCalledWith(dbFullPath);
            expect(mockInit).toHaveBeenCalledTimes(1);
        });

        it('runs all upgrade SQL on a new database, updates but does not attempt to retrieve version', async () => {
            mockStorage.contentFileExists.mockReturnValue(false);

            await mediaDb.initialise();

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

            await mediaDb.initialise();

            expect(mockExec).toHaveBeenCalledTimes(3);
            expect(mockExec).toHaveBeenNthCalledWith(1, versionSql[2]);
            expect(mockExec).toHaveBeenNthCalledWith(2, versionSql[3]);
            expect(mockExec).toHaveBeenNthCalledWith(3, 'UPDATE db_version SET version = 4;');
        });

        it('does not run upgrade SQL or store version on a database already at current version', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });

            await mediaDb.initialise();

            expect(mockExec).not.toHaveBeenCalled();
        });

        it('does not re-initialise or re-upgrade an already-initialised database', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 3 });

            await mediaDb.initialise();
            await mediaDb.initialise();

            expect(mockStorage.getContentFullPath).toHaveBeenCalledTimes(1);
            expect(mockStorage.contentFileExists).toHaveBeenCalledTimes(1);
            expect(mockInit).toHaveBeenCalledTimes(1);
            expect(mockGet).toHaveBeenCalledTimes(1);
            expect(mockExec).toHaveBeenCalledTimes(2);
        });
    });

    describe('getDbVersion', () => {
        it('returns the retrieved database version', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            await mediaDb.initialise();

            const ver = await mediaDb.getVersion();

            expect(ver).toBe(4);
        });
    });

    describe('shutdown', () => {
        it('closes the database', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockGet.mockResolvedValue({ ver: 4 });
            await mediaDb.initialise();

            await mediaDb.shutdown();

            expect(mockClose).toHaveBeenCalledTimes(1);
        });
    });
});