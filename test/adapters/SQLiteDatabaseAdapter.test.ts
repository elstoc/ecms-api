/* eslint-disable @typescript-eslint/no-explicit-any */
import { Database } from 'sqlite3';
import { SQLiteDatabaseAdapter } from '../../src/adapters/SQLiteDatabaseAdapter';
import { IDatabaseAdapter } from '../../src/adapters/IDatabaseAdapter';
const mockDatabase = jest.mocked(Database);

jest.mock('sqlite3');
const dbFullPath = '/path/to/file';

describe('SQLiteDatabaseAdapter', () => {
    let adapter: IDatabaseAdapter;

    beforeEach(() => {
        adapter = new SQLiteDatabaseAdapter(dbFullPath);
        mockDatabase.mockClear();
    });

    describe('initialise', () => {
        it('attempts to initialise the database and resolves if callback does not contain an error', async () => {
            const initPromise = adapter.initialise();

            expect(mockDatabase).toHaveBeenCalled();
            expect(mockDatabase.mock.calls[0][0]).toBe(dbFullPath);

            const cb = mockDatabase.mock.calls[0][1] as any;
            cb(null);

            await expect(initPromise).resolves.toBeUndefined();
        });

        it('attempts to initialise the database and rejects if callback does contain an error', async () => {
            const executionError = new Error('initialisation failed');
            const initPromise = adapter.initialise();

            expect(mockDatabase).toHaveBeenCalled();
            expect(mockDatabase.mock.calls[0][0]).toBe(dbFullPath);

            const cb = mockDatabase.mock.calls[0][1] as any;
            cb(executionError);

            await expect(initPromise).rejects.toThrow(executionError);
        });
    });

    describe('close', () => {
        beforeEach(async () => {
            const initPromise = adapter.initialise();
            const initCb = mockDatabase.mock.calls[0][1] as any;
            initCb(null);
            await initPromise;
        });

        it('attempts to close the database and resolves if callback does not contain an error', async () => {
            const createdDbInstance = mockDatabase.mock.instances[0];
            const closeCall = createdDbInstance.close as jest.Mock;

            const closePromise = adapter.close();
            expect(createdDbInstance.close).toHaveBeenCalled();
            const closeCb = closeCall.mock.calls[0][0];
            closeCb(null);

            await expect(closePromise).resolves.toBeUndefined();
        });

        it('attempts to close the database and rejects if callback does contain an error', async () => {
            const executionError = new Error('closure failed');

            const createdDbInstance = mockDatabase.mock.instances[0];
            const closeCall = createdDbInstance.close as jest.Mock;

            const closePromise = adapter.close();
            expect(createdDbInstance.close).toHaveBeenCalled();
            const closeCb = closeCall.mock.calls[0][0];
            closeCb(executionError);

            await expect(closePromise).rejects.toThrow(executionError);
        });
    });

    describe('get', () => {
        beforeEach(async () => {
            const initPromise = adapter.initialise();
            const initCb = mockDatabase.mock.calls[0][1] as any;
            initCb(null);
            await initPromise;
        });

        it('attempts to get from the database and returns the row if there is no error', async () => {
            const createdDbInstance = mockDatabase.mock.instances[0];
            const getCall = createdDbInstance.get as jest.Mock;

            const getPromise = adapter.get('sql');
            expect(createdDbInstance.get).toHaveBeenCalled();
            const [getSql, getCb] = getCall.mock.calls[0];
            getCb(null, 'returnVal');

            expect(getSql).toBe('sql');
            await expect(getPromise).resolves.toBe('returnVal');
        });

        it('attempts to get from the database and rejects if there is an error', async () => {
            const executionError = new Error('get failed');
            const createdDbInstance = mockDatabase.mock.instances[0];
            const getCall = createdDbInstance.get as jest.Mock;

            const getPromise = adapter.get('sql');
            expect(createdDbInstance.get).toHaveBeenCalled();
            const [getSql, getCb] = getCall.mock.calls[0];
            getCb(executionError);

            expect(getSql).toBe('sql');
            await expect(getPromise).rejects.toThrow(executionError);
        });
    });

    describe('exec', () => {
        beforeEach(async () => {
            const initPromise = adapter.initialise();
            const initCb = mockDatabase.mock.calls[0][1] as any;
            initCb(null);
            await initPromise;
        });

        it('attempts to exec sql and resolves if callback does not contain an error', async () => {
            const createdDbInstance = mockDatabase.mock.instances[0];
            const execCall = createdDbInstance.exec as jest.Mock;

            const execPromise = adapter.exec('sql');
            expect(createdDbInstance.exec).toHaveBeenCalled();
            const [execSql, execCb] = execCall.mock.calls[0];
            execCb(null);

            expect(execSql).toBe('sql');
            await expect(execPromise).resolves.toBeUndefined();
        });

        it('attempts to exec sql and rejects if callback does contain an error', async () => {
            const executionError = new Error('exec failed');
            const createdDbInstance = mockDatabase.mock.instances[0];
            const execCall = createdDbInstance.exec as jest.Mock;

            const execPromise = adapter.exec('sql');
            expect(createdDbInstance.exec).toHaveBeenCalled();
            const [execSql, execCb] = execCall.mock.calls[0];
            execCb(executionError);

            expect(execSql).toBe('sql');
            await expect(execPromise).rejects.toThrow(executionError);
        });
    });
});