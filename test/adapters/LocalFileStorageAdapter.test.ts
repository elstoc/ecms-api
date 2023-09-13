import fs from 'fs';
import { LocalFileStorageAdapter } from '../../src/adapters/LocalFileStorageAdapter';
import { IStorageAdapter } from '../../src/adapters/IStorageAdapter';

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    statSync: jest.fn(),
    mkdirSync: jest.fn(),
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        readdir: jest.fn()
    }
}));

const existsSyncMock = fs.existsSync as jest.Mock;
const statsyncMock = fs.statSync as jest.Mock;
const mkdirSyncMock = fs.mkdirSync as jest.Mock;
const promiseReadFileMock = fs.promises.readFile as jest.Mock;
const promiseWriteFileMock = fs.promises.writeFile as jest.Mock;
const promiseReaddirMock = fs.promises.readdir as jest.Mock;

const dataDir = '/path/to/data';

describe('LocalFileStorageAdapter', () => {
    let storage: IStorageAdapter;
    const fileMatcher = (fileName: string) => {
        return fileName.includes('match');
    };

    beforeEach(() => {
        existsSyncMock.mockReturnValueOnce(true);
        statsyncMock.mockReturnValueOnce({ isDirectory: () => true });
        storage = new LocalFileStorageAdapter(dataDir);
        jest.resetAllMocks();
    });

    describe('constructor', () => {
        it('throws an error if config.dataDir does not exist', () => {
            existsSyncMock.mockReturnValue(false);

            expect(() => new LocalFileStorageAdapter(dataDir))
                .toThrow(`${dataDir} is not an extant directory`);
            expect(existsSyncMock).toBeCalledWith(dataDir);
        });

        it('throws an error if config.dataDir is not a directory', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => false });

            expect(() => new LocalFileStorageAdapter(dataDir))
                .toThrow(`${dataDir} is not an extant directory`);
            expect(statsyncMock).toBeCalledWith(dataDir);
        });

        it('creates subdirectories if they do not exist', () => {
            existsSyncMock.mockImplementation((path) => path === dataDir);
            statsyncMock.mockReturnValue({ isDirectory: () => true });

            new LocalFileStorageAdapter(dataDir);

            expect(mkdirSyncMock).toBeCalledTimes(3);
            expect(mkdirSyncMock.mock.calls[0][0]).toBe(`${dataDir}/content`);
            expect(mkdirSyncMock.mock.calls[1][0]).toBe(`${dataDir}/admin`);
            expect(mkdirSyncMock.mock.calls[2][0]).toBe(`${dataDir}/cache`);
        });

        it('does not create subdirectories if they do exist', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => true });

            new LocalFileStorageAdapter(dataDir);

            expect(mkdirSyncMock).not.toBeCalled();
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

            expect(promiseReaddirMock).toBeCalledWith(`${dataDir}/content/some/path`);
        });

        it('returns an empty array if directory does not exist', async () => {
            existsSyncMock.mockReturnValue(false);
            
            const fileList = await storage.listContentChildren('some/path', fileMatcher);

            expect(existsSyncMock).toBeCalledWith(`${dataDir}/content/some/path`);
            expect(fileList).toEqual([]);
        });

        it('only returns matching files', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => true });

            const fileList = await storage.listContentChildren('some/path', fileMatcher);

            expect(statsyncMock).toBeCalledWith(`${dataDir}/content/some/path`);
            expect(promiseReaddirMock).toBeCalledWith(`${dataDir}/content/some/path`);
            expect(fileList).toEqual(['match','matched']);
        });
    });

    describe('contentFileExists', () => {
        it('returns false if the content file does not exist', () => {
            existsSyncMock.mockReturnValue(false);
            const exists = storage.contentFileExists('path/to/file');
            expect(exists).toBeFalsy();
            expect(existsSyncMock).toBeCalledWith(`${dataDir}/content/path/to/file`);
        });

        it('returns false if the content file is not a file', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isFile: () => false });
            const exists = storage.contentFileExists('path/to/file');
            expect(exists).toBeFalsy();
            expect(statsyncMock).toBeCalledWith(`${dataDir}/content/path/to/file`);
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
            expect(existsSyncMock).toBeCalledWith(`${dataDir}/content/path/to/file`);
        });

        it('returns false if the content file is not a file', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ isDirectory: () => false });
            const exists = storage.contentDirectoryExists('path/to/file');
            expect(exists).toBeFalsy();
            expect(statsyncMock).toBeCalledWith(`${dataDir}/content/path/to/file`);
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
            
            expect(promiseReadFileMock).toBeCalledWith(`${dataDir}/content/path/to/file`);
        });

        it('throws an error if the path does not exist', async () => {
            existsSyncMock.mockReturnValue(false);

            await expect(storage.getContentFile('path/to/file')).rejects.toThrowError();
        });

        it('throws an error if the path does not point to a file', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValueOnce({ isFile: () => false });

            await expect(storage.getContentFile('path/to/file')).rejects.toThrowError();
        });
    });

    describe('getAdminFile', () => {
        it('retrieves the file at the correct location', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValueOnce({ isFile: () => true });

            await storage.getAdminFile('path/to/file');
            
            expect(promiseReadFileMock).toBeCalledWith(`${dataDir}/admin/path/to/file`);
        });

        it('throws an error if the path does not exist', async () => {
            existsSyncMock.mockReturnValue(false);

            await expect(storage.getAdminFile('path/to/file')).rejects.toThrowError();
        });

        it('throws an error if the path does not point to a file', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValueOnce({ isFile: () => false });

            await expect(storage.getAdminFile('path/to/file')).rejects.toThrowError();
        });
    });

    describe('getGeneratedFile', () => {
        it('retrieves the file at the correct location', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValueOnce({ isFile: () => true });

            await storage.getGeneratedFile('path/to/file', 'tag');
            
            expect(promiseReadFileMock).toBeCalledWith(`${dataDir}/cache/path/to/tag/file`);
        });

        it('throws an error if the path does not exist', async () => {
            existsSyncMock.mockReturnValue(false);

            await expect(storage.getGeneratedFile('path/to/file', 'tag')).rejects.toThrowError();
        });

        it('throws an error if the path does not point to a file', async () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValueOnce({ isFile: () => false });

            await expect(storage.getGeneratedFile('path/to/file', 'tag')).rejects.toThrowError();
        });
    });

    describe('storeAdminFile', () => {
        it('creates directories if they do not exist', async () => {
            existsSyncMock.mockReturnValue(false);
            await storage.storeAdminFile('dir/file', Buffer.from('file-contents'));
            expect(mkdirSyncMock).toBeCalledWith(`${dataDir}/admin/dir`, { recursive: true });
        });

        it('does not create directories if they do exist', async () => {
            existsSyncMock.mockReturnValue(true);
            await storage.storeAdminFile('dir/file', Buffer.from('file-contents'));
            expect(mkdirSyncMock).not.toBeCalled();
        });

        it('attempts to store the file with the correct parameters', async () => {
            existsSyncMock.mockReturnValue(true);
            await storage.storeAdminFile('dir/file', Buffer.from('file-contents'));
            expect(promiseWriteFileMock).toBeCalledWith(`${dataDir}/admin/dir/file`, Buffer.from('file-contents'));
        });
    });

    describe('storeContentFile', () => {
        it('creates directories if they do not exist', async () => {
            existsSyncMock.mockReturnValue(false);
            await storage.storeContentFile('dir/file', Buffer.from('file-contents'));
            expect(mkdirSyncMock).toBeCalledWith(`${dataDir}/content/dir`, { recursive: true });
        });

        it('does not create directories if they do exist', async () => {
            existsSyncMock.mockReturnValue(true);
            await storage.storeContentFile('dir/file', Buffer.from('file-contents'));
            expect(mkdirSyncMock).not.toBeCalled();
        });

        it('attempts to store the file with the correct parameters', async () => {
            existsSyncMock.mockReturnValue(true);
            await storage.storeContentFile('dir/file', Buffer.from('file-contents'));
            expect(promiseWriteFileMock).toBeCalledWith(`${dataDir}/content/dir/file`, Buffer.from('file-contents'));
        });
    });

    describe('storeGeneratedFile', () => {
        it('creates directories if they do not exist', async () => {
            existsSyncMock.mockReturnValue(false);
            await storage.storeGeneratedFile('dir/file', 'tag', Buffer.from('file-contents'));
            expect(mkdirSyncMock).toBeCalledWith(`${dataDir}/cache/dir/tag`, { recursive: true });
        });

        it('does not create directories if they do exist', async () => {
            existsSyncMock.mockReturnValue(true);
            await storage.storeGeneratedFile('dir/file', 'tag', Buffer.from('file-contents'));
            expect(mkdirSyncMock).not.toBeCalled();
        });

        it('attempts to store the file with the correct parameters', async () => {
            existsSyncMock.mockReturnValue(true);
            await storage.storeGeneratedFile('dir/file', 'tag', Buffer.from('file-contents'));
            expect(promiseWriteFileMock).toBeCalledWith(`${dataDir}/cache/dir/tag/file`, Buffer.from('file-contents'));
        });
    });

    describe('getContentFileModifiedTime', () => {
        it('returns 0 if the file does not exist', () => {
            existsSyncMock.mockReturnValue(false);

            const mTime = storage.getContentFileModifiedTime('path/to/file');

            expect(existsSyncMock).toBeCalledWith(`${dataDir}/content/path/to/file`);
            expect(mTime).toBe(0);
        });

        it('returns the modified time if the file does exist', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ mtimeMs: 100 });

            const mTime = storage.getContentFileModifiedTime('path/to/file');

            expect(statsyncMock).toBeCalledWith(`${dataDir}/content/path/to/file`);
            expect(mTime).toBe(100);
        });
    });

    describe('getAdminFileModifiedTime', () => {
        it('returns 0 if the file does not exist', () => {
            existsSyncMock.mockReturnValue(false);

            const mTime = storage.getAdminFileModifiedTime('path/to/file');

            expect(existsSyncMock).toBeCalledWith(`${dataDir}/admin/path/to/file`);
            expect(mTime).toBe(0);
        });

        it('returns the modified time if the file does exist', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockReturnValue({ mtimeMs: 100 });

            const mTime = storage.getAdminFileModifiedTime('path/to/file');

            expect(statsyncMock).toBeCalledWith(`${dataDir}/admin/path/to/file`);
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
            expect(statsyncMock).toBeCalledWith(`${dataDir}/cache/path/to/tag/file`);
            expect(statsyncMock).toBeCalledWith(`${dataDir}/content/path/to/file`);
            expect(isOlder).toBeTruthy();
        });

        it('returns false if the generated file is the same age', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockImplementation(() => (
                { mtimeMs: 100 }
            ));

            const isOlder = storage.generatedFileIsOlder('path/to/file', 'tag');
            expect(statsyncMock).toBeCalledWith(`${dataDir}/cache/path/to/tag/file`);
            expect(statsyncMock).toBeCalledWith(`${dataDir}/content/path/to/file`);
            expect(isOlder).toBeFalsy();
        });

        it('returns true if the generated file is newer', () => {
            existsSyncMock.mockReturnValue(true);
            statsyncMock.mockImplementation((fileName) => (
                { mtimeMs: fileName.includes('cache') ? 200 : 100 }
            ));

            const isOlder = storage.generatedFileIsOlder('path/to/file', 'tag');
            expect(statsyncMock).toBeCalledWith(`${dataDir}/cache/path/to/tag/file`);
            expect(statsyncMock).toBeCalledWith(`${dataDir}/content/path/to/file`);
            expect(isOlder).toBeFalsy();
        });
    });
});
