/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from './fs';
import { LocalFileStorageAdapter } from '.';
import { SQLiteDatabaseAdapter } from '.';
import { StorageAdapter } from './StorageAdapter';
const mockSQLiteDatabaseAdapter = jest.mocked(SQLiteDatabaseAdapter);

jest.mock('./SQLiteDatabaseAdapter');

jest.mock('../../src/adapters/fs', () => ({
    existsSync: jest.fn(),
    statSync: jest.fn(),
    mkdirSync: jest.fn(),
    chownSync: jest.fn(),
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        readdir: jest.fn(),
        rm: jest.fn()
    }
}));

const existsSyncMock = fs.existsSync as jest.Mock;
const statsyncMock = fs.statSync as jest.Mock;
const mkdirSyncMock = fs.mkdirSync as jest.Mock;
const chownSyncMock = fs.chownSync as jest.Mock;
const promiseReadFileMock = fs.promises.readFile as jest.Mock;
const promiseWriteFileMock = fs.promises.writeFile as jest.Mock;
const promiseReaddirMock = fs.promises.readdir as jest.Mock;
const promiseRmMock = fs.promises.rm as jest.Mock;

const dataDir = '/path/to/data';

describe('LocalFileStorageAdapter', () => {
    let storage: StorageAdapter;
    const mockInit = jest.fn();
    const mockExec = jest.fn();
    const fileMatcher = (fileName: string) => {
        return fileName.includes('match');
    };

    beforeEach(() => {
        existsSyncMock.mockReturnValue(true);
        statsyncMock.mockReturnValue({ isDirectory: () => true });
        storage = new LocalFileStorageAdapter(dataDir);
        jest.resetAllMocks();
        mockSQLiteDatabaseAdapter.mockClear();
        mockSQLiteDatabaseAdapter.mockImplementation(() => ({
            initialise: mockInit,
            exec: mockExec
        } as any));
    });

    describe('constructor', () => {
        it('throws an error if config.dataDir does not exist', () => {
            existsSyncMock.mockReturnValue(false);

            expect(() => new LocalFileStorageAdapter(dataDir))
                .toThrow(`${dataDir} is not an extant directory`);
            expect(existsSyncMock).toHaveBeenCalledWith(dataDir);
        });

        it('throws an error if config.dataDir is not a directory', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => false });

            expect(() => new LocalFileStorageAdapter(dataDir))
                .toThrow(`${dataDir} is not an extant directory`);
            expect(statsyncMock).toHaveBeenCalledWith(dataDir);
        });

        it('creates subdirectories if they do not exist', () => {
            existsSyncMock.mockImplementation((path) => path === dataDir);
            statsyncMock.mockReturnValue({ isDirectory: () => true });

            new LocalFileStorageAdapter(dataDir);

            expect(mkdirSyncMock).toHaveBeenCalledTimes(3);
            expect(mkdirSyncMock.mock.calls[0][0]).toBe(`${dataDir}/content`);
            expect(mkdirSyncMock.mock.calls[1][0]).toBe(`${dataDir}/admin`);
            expect(mkdirSyncMock.mock.calls[2][0]).toBe(`${dataDir}/cache`);
        });

        it('attempts to chown subdirectories if uid/gid are set', () => {
            existsSyncMock.mockImplementation((path) => path === dataDir);
            statsyncMock.mockReturnValue({ isDirectory: () => true });

            new LocalFileStorageAdapter(dataDir, 1000, 1000);

            expect(chownSyncMock).toHaveBeenCalledTimes(3);
            expect(chownSyncMock).toHaveBeenCalledWith(`${dataDir}/content`, 1000, 1000);
            expect(chownSyncMock).toHaveBeenCalledWith(`${dataDir}/admin`, 1000, 1000);
            expect(chownSyncMock).toHaveBeenCalledWith(`${dataDir}/cache`, 1000, 1000);
        });

        it('handles any errors chowning subdirectories', () => {
            existsSyncMock.mockImplementation((path) => path === dataDir);
            statsyncMock.mockReturnValue({ isDirectory: () => true });
            chownSyncMock.mockImplementation(() => {
                throw new Error('cannot chown');
            });

            expect(() => new LocalFileStorageAdapter(dataDir, 1000, 1000)).not.toThrow();

            expect(chownSyncMock).toHaveBeenCalledTimes(3);
        });

        it('does not attempt to chown subdirectories if uid is not set', () => {
            existsSyncMock.mockImplementation((path) => path === dataDir);
            statsyncMock.mockReturnValue({ isDirectory: () => true });

            new LocalFileStorageAdapter(dataDir, undefined, 1000);

            expect(chownSyncMock).not.toHaveBeenCalled();
        });

        it('does not attempt to chown subdirectories if gid is not set', () => {
            existsSyncMock.mockImplementation((path) => path === dataDir);
            statsyncMock.mockReturnValue({ isDirectory: () => true });

            new LocalFileStorageAdapter(dataDir, 1000, undefined);

            expect(chownSyncMock).not.toHaveBeenCalled();
        });

        it('does not create subdirectories if they do exist', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => true });

            new LocalFileStorageAdapter(dataDir);

            expect(mkdirSyncMock).not.toHaveBeenCalled();
        });
    });

    describe('listContentChildren', () => {
        beforeEach(() => {
            promiseReaddirMock.mockResolvedValue(['notMatched', 'match', 'matched', 'something']);
        });

        it('reads the correct directory', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => true });
            promiseReaddirMock.mockResolvedValue([]);

            await storage.listContentChildren('some/path', fileMatcher);

            expect(promiseReaddirMock).toHaveBeenCalledWith(`${dataDir}/content/some/path`);
        });

        it('returns an empty array if directory does not exist', async () => {
            existsSyncMock.mockReturnValue(false);
            
            const fileList = await storage.listContentChildren('some/path', fileMatcher);

            expect(existsSyncMock).toHaveBeenCalledWith(`${dataDir}/content/some/path`);
            expect(fileList).toEqual([]);
        });

        it('only returns matching files', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => true });

            const fileList = await storage.listContentChildren('some/path', fileMatcher);

            expect(statsyncMock).toHaveBeenCalledWith(`${dataDir}/content/some/path`);
            expect(promiseReaddirMock).toHaveBeenCalledWith(`${dataDir}/content/some/path`);
            expect(fileList).toEqual(['match','matched']);
        });
    });

    describe('contentFileExists', () => {
        it('returns false if the content file does not exist', () => {
            existsSyncMock.mockReturnValue(false);
            const exists = storage.contentFileExists('path/to/file');
            expect(exists).toBeFalsy();
            expect(existsSyncMock).toHaveBeenCalledWith(`${dataDir}/content/path/to/file`);
        });

        it('returns false if the content file is not a file', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isFile: () => false });
            const exists = storage.contentFileExists('path/to/file');
            expect(exists).toBeFalsy();
            expect(statsyncMock).toHaveBeenCalledWith(`${dataDir}/content/path/to/file`);
        });

        it('returns true if the content exists and is a file', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isFile: () => true });
            const exists = storage.contentFileExists('path/to/file');
            expect(exists).toBeTruthy();
        });
    });

    describe('contentDirectoryExists', () => {
        it('returns false if the content file does not exist', () => {
            existsSyncMock.mockReturnValue(false);
            const exists = storage.contentDirectoryExists('path/to/file');
            expect(exists).toBeFalsy();
            expect(existsSyncMock).toHaveBeenCalledWith(`${dataDir}/content/path/to/file`);
        });

        it('returns false if the content file is not a file', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => false });
            const exists = storage.contentDirectoryExists('path/to/file');
            expect(exists).toBeFalsy();
            expect(statsyncMock).toHaveBeenCalledWith(`${dataDir}/content/path/to/file`);
        });

        it('returns true if the content exists and is a file', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => true });
            const exists = storage.contentDirectoryExists('path/to/file');
            expect(exists).toBeTruthy();
        });
    });

    describe('getContentFile', () => {
        it('retrieves the file at the correct location', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValueOnce({ isFile: () => true });

            await storage.getContentFile('path/to/file');
            
            expect(promiseReadFileMock).toHaveBeenCalledWith(`${dataDir}/content/path/to/file`);
        });

        it('throws an error if the path does not exist', async () => {
            existsSyncMock.mockReturnValue(false);

            await expect(storage.getContentFile('path/to/file')).rejects.toThrow();
        });

        it('throws an error if the path does not point to a file', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValueOnce({ isFile: () => false });

            await expect(storage.getContentFile('path/to/file')).rejects.toThrow();
        });
    });

    describe('getAdminFile', () => {
        it('retrieves the file at the correct location', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValueOnce({ isFile: () => true });

            await storage.getAdminFile('path/to/file');
            
            expect(promiseReadFileMock).toHaveBeenCalledWith(`${dataDir}/admin/path/to/file`);
        });

        it('throws an error if the path does not exist', async () => {
            existsSyncMock.mockReturnValue(false);

            await expect(storage.getAdminFile('path/to/file')).rejects.toThrow();
        });

        it('throws an error if the path does not point to a file', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValueOnce({ isFile: () => false });

            await expect(storage.getAdminFile('path/to/file')).rejects.toThrow();
        });
    });

    describe('getGeneratedFile', () => {
        it('retrieves the file at the correct location', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValueOnce({ isFile: () => true });

            await storage.getGeneratedFile('path/to/file', 'tag');
            
            expect(promiseReadFileMock).toHaveBeenCalledWith(`${dataDir}/cache/path/to/tag/file`);
        });

        it('throws an error if the path does not exist', async () => {
            existsSyncMock.mockReturnValue(false);

            await expect(storage.getGeneratedFile('path/to/file', 'tag')).rejects.toThrow();
        });

        it('throws an error if the path does not point to a file', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValueOnce({ isFile: () => false });

            await expect(storage.getGeneratedFile('path/to/file', 'tag')).rejects.toThrow();
        });
    });

    describe('storeAdminFile', () => {
        it('creates directories if they do not exist', async () => {
            existsSyncMock.mockImplementation((path: string) => !path.startsWith(`${dataDir}/admin/`));

            await storage.storeAdminFile('full/path/to/file', Buffer.from('file-contents'));

            expect(mkdirSyncMock).toHaveBeenCalledTimes(3);
            expect(mkdirSyncMock).toHaveBeenCalledWith(`${dataDir}/admin/full`);
            expect(mkdirSyncMock).toHaveBeenCalledWith(`${dataDir}/admin/full/path`);
            expect(mkdirSyncMock).toHaveBeenCalledWith(`${dataDir}/admin/full/path/to`);
        });

        it('does not create directories if they do exist', async () => {
            existsSyncMock.mockReturnValue(true);
            await storage.storeAdminFile('dir/file', Buffer.from('file-contents'));
            expect(mkdirSyncMock).not.toHaveBeenCalled();
        });

        it('attempts to store the file with the correct parameters', async () => {
            existsSyncMock.mockReturnValue(true);
            await storage.storeAdminFile('dir/file', Buffer.from('file-contents'));
            expect(promiseWriteFileMock).toHaveBeenCalledWith(`${dataDir}/admin/dir/file`, Buffer.from('file-contents'));
        });

        it('attempts to chown files/folders if uid and gid are set', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => true });
            storage = new LocalFileStorageAdapter(dataDir, 1000, 1000);
            existsSyncMock.mockImplementation((path: string) => !path.startsWith(`${dataDir}/admin/`));
            statsyncMock.mockImplementation((path: string) => ({ isDirectory: () => !path.endsWith('file') }));

            await storage.storeAdminFile('path/to/file', Buffer.from('file-contents'));

            expect(chownSyncMock).toHaveBeenCalledTimes(3);
            expect(chownSyncMock).toHaveBeenCalledWith(`${dataDir}/admin/path`, 1000, 1000);
            expect(chownSyncMock).toHaveBeenCalledWith(`${dataDir}/admin/path/to`, 1000, 1000);
            expect(chownSyncMock).toHaveBeenCalledWith(`${dataDir}/admin/path/to/file`, 1000, 1000);
        });

        it('handles any errors when chowning files/folders', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => true });
            storage = new LocalFileStorageAdapter(dataDir, 1000, 1000);
            existsSyncMock.mockImplementation((path: string) => !path.startsWith(`${dataDir}/admin/`));
            statsyncMock.mockImplementation((path: string) => ({ isDirectory: () => !path.endsWith('file') }));
            chownSyncMock.mockImplementation(() => { throw new Error('cannot chown'); });

            await expect(storage.storeAdminFile('path/to/file', Buffer.from('file-contents'))).resolves.toBeUndefined();

            expect(chownSyncMock).toHaveBeenCalledTimes(3);
        });

        it('does not attempt to chown files/folders if uid not set', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => true });
            storage = new LocalFileStorageAdapter(dataDir, undefined, 1000);
            existsSyncMock.mockImplementation((path: string) => !path.startsWith(`${dataDir}/admin/`));
            statsyncMock.mockImplementation((path: string) => ({ isDirectory: () => !path.endsWith('file') }));
            chownSyncMock.mockImplementation(() => { throw new Error('cannot chown'); });

            await storage.storeAdminFile('path/to/file', Buffer.from('file-contents'));

            expect(chownSyncMock).not.toHaveBeenCalled();
        });

        it('does not attempt to chown files/folders if gid not set', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => true });
            storage = new LocalFileStorageAdapter(dataDir, 1000, undefined);
            existsSyncMock.mockImplementation((path: string) => !path.startsWith(`${dataDir}/admin/`));
            statsyncMock.mockImplementation((path: string) => ({ isDirectory: () => !path.endsWith('file') }));
            chownSyncMock.mockImplementation(() => { throw new Error('cannot chown'); });

            await storage.storeAdminFile('path/to/file', Buffer.from('file-contents'));

            expect(chownSyncMock).not.toHaveBeenCalled();
        });
    });

    describe('storeContentFile', () => {
        it('creates directories if they do not exist', async () => {
            existsSyncMock.mockImplementation((path: string) => !path.startsWith(`${dataDir}/content/`));

            await storage.storeContentFile('full/path/to/file', Buffer.from('file-contents'));

            expect(mkdirSyncMock).toHaveBeenCalledTimes(3);
            expect(mkdirSyncMock).toHaveBeenCalledWith(`${dataDir}/content/full`);
            expect(mkdirSyncMock).toHaveBeenCalledWith(`${dataDir}/content/full/path`);
            expect(mkdirSyncMock).toHaveBeenCalledWith(`${dataDir}/content/full/path/to`);
        });

        it('does not create directories if they do exist', async () => {
            existsSyncMock.mockReturnValue(true);
            await storage.storeContentFile('dir/file', Buffer.from('file-contents'));
            expect(mkdirSyncMock).not.toHaveBeenCalled();
        });

        it('attempts to store the file with the correct parameters', async () => {
            existsSyncMock.mockReturnValue(true);
            await storage.storeContentFile('dir/file', Buffer.from('file-contents'));
            expect(promiseWriteFileMock).toHaveBeenCalledWith(`${dataDir}/content/dir/file`, Buffer.from('file-contents'));
        });

        it('attempts to chown files/folders if uid and gid are set', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => true });
            storage = new LocalFileStorageAdapter(dataDir, 1000, 1000);
            existsSyncMock.mockImplementation((path: string) => !path.startsWith(`${dataDir}/content/`));
            statsyncMock.mockImplementation((path: string) => ({ isDirectory: () => !path.endsWith('file') }));

            await storage.storeContentFile('path/to/file', Buffer.from('file-contents'));

            expect(chownSyncMock).toHaveBeenCalledTimes(3);
            expect(chownSyncMock).toHaveBeenCalledWith(`${dataDir}/content/path`, 1000, 1000);
            expect(chownSyncMock).toHaveBeenCalledWith(`${dataDir}/content/path/to`, 1000, 1000);
            expect(chownSyncMock).toHaveBeenCalledWith(`${dataDir}/content/path/to/file`, 1000, 1000);
        });

        it('handles any errors when chowning files/folders', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => true });
            storage = new LocalFileStorageAdapter(dataDir, 1000, 1000);
            existsSyncMock.mockImplementation((path: string) => !path.startsWith(`${dataDir}/content/`));
            statsyncMock.mockImplementation((path: string) => ({ isDirectory: () => !path.endsWith('file') }));
            chownSyncMock.mockImplementation(() => { throw new Error('cannot chown'); });

            await expect(storage.storeContentFile('path/to/file', Buffer.from('file-contents'))).resolves.toBeUndefined();

            expect(chownSyncMock).toHaveBeenCalledTimes(3);
        });

        it('does not attempt to chown files/folders if uid not set', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => true });
            storage = new LocalFileStorageAdapter(dataDir, undefined, 1000);
            existsSyncMock.mockImplementation((path: string) => !path.startsWith(`${dataDir}/content/`));
            statsyncMock.mockImplementation((path: string) => ({ isDirectory: () => !path.endsWith('file') }));
            chownSyncMock.mockImplementation(() => { throw new Error('cannot chown'); });

            await storage.storeContentFile('path/to/file', Buffer.from('file-contents'));

            expect(chownSyncMock).not.toHaveBeenCalled();
        });

        it('does not attempt to chown files/folders if gid not set', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => true });
            storage = new LocalFileStorageAdapter(dataDir, 1000, undefined);
            existsSyncMock.mockImplementation((path: string) => !path.startsWith(`${dataDir}/content/`));
            statsyncMock.mockImplementation((path: string) => ({ isDirectory: () => !path.endsWith('file') }));
            chownSyncMock.mockImplementation(() => { throw new Error('cannot chown'); });

            await storage.storeContentFile('path/to/file', Buffer.from('file-contents'));

            expect(chownSyncMock).not.toHaveBeenCalled();
        });
    });

    describe('storeGeneratedFile', () => {
        it('creates directories if they do not exist', async () => {
            existsSyncMock.mockImplementation((path: string) => !path.startsWith(`${dataDir}/cache/`));

            await storage.storeGeneratedFile('full/path/to/file', 'tag', Buffer.from('file-contents'));

            expect(mkdirSyncMock).toHaveBeenCalledTimes(4);
            expect(mkdirSyncMock).toHaveBeenCalledWith(`${dataDir}/cache/full`);
            expect(mkdirSyncMock).toHaveBeenCalledWith(`${dataDir}/cache/full/path`);
            expect(mkdirSyncMock).toHaveBeenCalledWith(`${dataDir}/cache/full/path/to`);
            expect(mkdirSyncMock).toHaveBeenCalledWith(`${dataDir}/cache/full/path/to/tag`);
        });

        it('does not create directories if they do exist', async () => {
            existsSyncMock.mockReturnValue(true);
            await storage.storeGeneratedFile('dir/file', 'tag', Buffer.from('file-contents'));
            expect(mkdirSyncMock).not.toHaveBeenCalled();
        });

        it('attempts to store the file with the correct parameters', async () => {
            existsSyncMock.mockReturnValue(true);
            await storage.storeGeneratedFile('dir/file', 'tag', Buffer.from('file-contents'));
            expect(promiseWriteFileMock).toHaveBeenCalledWith(`${dataDir}/cache/dir/tag/file`, Buffer.from('file-contents'));
        });

        it('attempts to chown files/folders if uid and gid are set', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => true });
            storage = new LocalFileStorageAdapter(dataDir, 1000, 1000);
            existsSyncMock.mockImplementation((path: string) => !path.startsWith(`${dataDir}/cache/`));
            statsyncMock.mockImplementation((path: string) => ({ isDirectory: () => !path.endsWith('file') }));

            await storage.storeGeneratedFile('path/to/file', 'tag', Buffer.from('file-contents'));

            expect(chownSyncMock).toHaveBeenCalledTimes(4);
            expect(chownSyncMock).toHaveBeenCalledWith(`${dataDir}/cache/path`, 1000, 1000);
            expect(chownSyncMock).toHaveBeenCalledWith(`${dataDir}/cache/path/to`, 1000, 1000);
            expect(chownSyncMock).toHaveBeenCalledWith(`${dataDir}/cache/path/to/tag`, 1000, 1000);
            expect(chownSyncMock).toHaveBeenCalledWith(`${dataDir}/cache/path/to/tag/file`, 1000, 1000);
        });

        it('handles any errors when chowning files/folders', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => true });
            storage = new LocalFileStorageAdapter(dataDir, 1000, 1000);
            existsSyncMock.mockImplementation((path: string) => !path.startsWith(`${dataDir}/cache/`));
            statsyncMock.mockImplementation((path: string) => ({ isDirectory: () => !path.endsWith('file') }));
            chownSyncMock.mockImplementation(() => { throw new Error('cannot chown'); });

            await expect(storage.storeGeneratedFile('path/to/file', 'tag', Buffer.from('file-contents'))).resolves.toBeUndefined();

            expect(chownSyncMock).toHaveBeenCalledTimes(4);
        });

        it('does not attempt to chown files/folders if uid not set', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => true });
            storage = new LocalFileStorageAdapter(dataDir, undefined, 1000);
            existsSyncMock.mockImplementation((path: string) => !path.startsWith(`${dataDir}/cache/`));
            statsyncMock.mockImplementation((path: string) => ({ isDirectory: () => !path.endsWith('file') }));
            chownSyncMock.mockImplementation(() => { throw new Error('cannot chown'); });

            await storage.storeGeneratedFile('path/to/file', 'tag', Buffer.from('file-contents'));

            expect(chownSyncMock).not.toHaveBeenCalled();
        });

        it('does not attempt to chown files/folders if gid not set', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => true });
            storage = new LocalFileStorageAdapter(dataDir, 1000, undefined);
            existsSyncMock.mockImplementation((path: string) => !path.startsWith(`${dataDir}/cache/`));
            statsyncMock.mockImplementation((path: string) => ({ isDirectory: () => !path.endsWith('file') }));
            chownSyncMock.mockImplementation(() => { throw new Error('cannot chown'); });

            await storage.storeGeneratedFile('path/to/file', 'tag', Buffer.from('file-contents'));

            expect(chownSyncMock).not.toHaveBeenCalled();
        });
    });

    describe('getContentFileModifiedTime', () => {
        it('returns 0 if the file does not exist', () => {
            existsSyncMock.mockReturnValue(false);

            const mTime = storage.getContentFileModifiedTime('path/to/file');

            expect(existsSyncMock).toHaveBeenCalledWith(`${dataDir}/content/path/to/file`);
            expect(mTime).toBe(0);
        });

        it('returns the modified time if the file does exist', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ mtimeMs: 100 });

            const mTime = storage.getContentFileModifiedTime('path/to/file');

            expect(statsyncMock).toHaveBeenCalledWith(`${dataDir}/content/path/to/file`);
            expect(mTime).toBe(100);
        });
    });

    describe('getContentFullPath', () => {
        it('returns the full path of the content file', () => {
            const fullPath = storage.getContentFullPath('path/to/file');

            expect(fullPath).toBe(`${dataDir}/content/path/to/file`);
        });
    });

    describe('getAdminFileModifiedTime', () => {
        it('returns 0 if the file does not exist', () => {
            existsSyncMock.mockReturnValue(false);

            const mTime = storage.getAdminFileModifiedTime('path/to/file');

            expect(existsSyncMock).toHaveBeenCalledWith(`${dataDir}/admin/path/to/file`);
            expect(mTime).toBe(0);
        });

        it('returns the modified time if the file does exist', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ mtimeMs: 100 });

            const mTime = storage.getAdminFileModifiedTime('path/to/file');

            expect(statsyncMock).toHaveBeenCalledWith(`${dataDir}/admin/path/to/file`);
            expect(mTime).toBe(100);
        });
    });

    describe('generatedFileIsOlder', () => {
        it('returns true if the generated file is older', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockImplementation((fileName) => (
                { mtimeMs: fileName.includes('cache') ? 100 : 200 }
            ));

            const isOlder = storage.generatedFileIsOlder('path/to/file', 'tag');
            expect(statsyncMock).toHaveBeenCalledWith(`${dataDir}/cache/path/to/tag/file`);
            expect(statsyncMock).toHaveBeenCalledWith(`${dataDir}/content/path/to/file`);
            expect(isOlder).toBeTruthy();
        });

        it('returns false if the generated file is the same age', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockImplementation(() => (
                { mtimeMs: 100 }
            ));

            const isOlder = storage.generatedFileIsOlder('path/to/file', 'tag');
            expect(statsyncMock).toHaveBeenCalledWith(`${dataDir}/cache/path/to/tag/file`);
            expect(statsyncMock).toHaveBeenCalledWith(`${dataDir}/content/path/to/file`);
            expect(isOlder).toBeFalsy();
        });

        it('returns true if the generated file is newer', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockImplementation((fileName) => (
                { mtimeMs: fileName.includes('cache') ? 200 : 100 }
            ));

            const isOlder = storage.generatedFileIsOlder('path/to/file', 'tag');
            expect(statsyncMock).toHaveBeenCalledWith(`${dataDir}/cache/path/to/tag/file`);
            expect(statsyncMock).toHaveBeenCalledWith(`${dataDir}/content/path/to/file`);
            expect(isOlder).toBeFalsy();
        });
    });

    describe('deleteContentFile', () => {
        it('attempts to remove the file if it exists', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValueOnce({ isFile: () => true });

            await storage.deleteContentFile('path/to/file');

            expect(existsSyncMock).toHaveBeenCalledWith(`${dataDir}/content/path/to/file`);
            expect(promiseRmMock).toHaveBeenCalledWith(`${dataDir}/content/path/to/file`);
        });

        it('throws an error if the file does not exist', async () => {
            existsSyncMock.mockReturnValue(false);
            statsyncMock.mockReturnValueOnce({ isFile: () => false });

            await expect(storage.deleteContentFile('path/to/file')).rejects.toThrow();

            expect(existsSyncMock).toHaveBeenCalledWith(`${dataDir}/content/path/to/file`);
        });
    });

    describe('getContentDb', () => {
        it('creates the database file with an empty buffer if it does not exist', async () => {
            existsSyncMock.mockImplementation((path) => !path.endsWith('file'));
            statsyncMock.mockImplementation((path) => ({
                isFile: () => false,
                isDirectory: () => !path.endsWith('file')
            }));

            await storage.getContentDb('path/to/file');

            expect(promiseWriteFileMock).toHaveBeenCalledWith(`${dataDir}/content/path/to/file`, Buffer.from(''));
        });

        it('does not create the database file with an empty buffer if it does exist', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockImplementation((path) => ({
                isFile: () => path.endsWith('file'),
                isDirectory: () => !path.endsWith('file')
            }));

            await storage.getContentDb('path/to/file');

            expect(promiseWriteFileMock).not.toHaveBeenCalled();
        });

        it('creates and initialises a sqlite database adapter instance with the correct path', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockImplementation((path) => ({
                isFile: () => path.endsWith('file'),
                isDirectory: () => !path.endsWith('file')
            }));

            await storage.getContentDb('path/to/file');

            expect(mockSQLiteDatabaseAdapter).toHaveBeenCalledWith(`${dataDir}/content/path/to/file`);
            expect(mockInit).toHaveBeenCalled();
            expect(mockExec).toHaveBeenCalledWith('PRAGMA foreign_keys = ON');
        });
    });
});
