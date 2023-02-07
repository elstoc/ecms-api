/* eslint-disable  @typescript-eslint/no-explicit-any */
import { pathIsDirectory, pathIsFile, pathModifiedTime} from '../../../src/utils/site/fsUtils';
import fs from 'fs';
jest.mock('fs');

describe('fsUtils', () => {
    const existsSyncMock = fs.existsSync as jest.Mock,
        statSyncMock = fs.statSync as jest.Mock;

    beforeEach(() => {
        statSyncMock.mockImplementation((path) => ({
            isDirectory: () => path.endsWith('dir'),
            mtimeMs: 1234
        }));
        existsSyncMock.mockReturnValue(true);
    });

    it('reports existing files as files and not directories', () => {
        expect(pathIsDirectory('file')).toBe(false);
        expect(pathIsFile('file')).toBe(true);
    });

    it('reports existing directories as directories and not files', () => {
        expect(pathIsDirectory('dir')).toBe(true);
        expect(pathIsFile('dir')).toBe(false);
    });

    it('reports nonexisting paths as neither directories nor files', () => {
        existsSyncMock.mockReturnValue(false);
        expect(pathIsDirectory('dir')).toBe(false);
        expect(pathIsFile('file')).toBe(false);
    });

    it('reports the correct modified time of existing paths', () => {
        expect(pathModifiedTime('file')).toBe(1234);
    });

    it('reports the modified time of non-existing paths as zero', () => {
        existsSyncMock.mockReturnValue(false);
        expect(pathModifiedTime('file')).toBe(0);
    });
});
