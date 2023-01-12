/* eslint-disable  @typescript-eslint/no-explicit-any */
import { SitePaths } from './SitePaths';
import fs from 'fs';

jest.mock('fs');

const config = {
    cacheDir: '/path/to/cache',
    contentDir: '/path/to/content',
    adminDir: '/path/to/admin'
} as any;

describe('That SitePaths', () => {
    let sitePaths: SitePaths;

    beforeEach(() => {
        sitePaths = new SitePaths(config);
    });

    describe('getContentPath', () => {
        it('attempts to resolve a content path correctly', () => {
            const expectedResult = '/path/to/content/path/to/required/file';
            const contentPath = sitePaths.getContentPath('path', 'to', 'required', 'file');
            expect(contentPath).toBe(expectedResult);
        });

        it('returns the base content path when called with no parameters', () => {
            const expectedResult = '/path/to/content';
            const contentPath = sitePaths.getContentPath();
            expect(contentPath).toBe(expectedResult);
        });

        it('returns the base content path when called with empty string', () => {
            const expectedResult = '/path/to/content';
            const contentPath = sitePaths.getContentPath('');
            expect(contentPath).toBe(expectedResult);
        });
    });

    describe('getCachePath', () => {
        it('attempts to resolve a cache path correctly', () => {
            const expectedResult = '/path/to/cache/path/to/required/file';
            const cachePath = sitePaths.getCachePath('path', 'to', 'required', 'file');
            expect(cachePath).toBe(expectedResult);
        });

        it('returns the base cache path when called with no parameters', () => {
            const expectedResult = '/path/to/cache';
            const cachePath = sitePaths.getCachePath();
            expect(cachePath).toBe(expectedResult);
        });

        it('returns the base cache path when called with empty string', () => {
            const expectedResult = '/path/to/cache';
            const cachePath = sitePaths.getCachePath('');
            expect(cachePath).toBe(expectedResult);
        });
    });

    describe('getAdminPath', () => {
        it('attempts to resolve an admin path correctly', () => {
            const expectedResult = '/path/to/admin/path/to/required/file';
            const adminPath = sitePaths.getAdminPath('path', 'to', 'required', 'file');
            expect(adminPath).toBe(expectedResult);
        });

        it('returns the base admin path when called with no parameters', () => {
            const expectedResult = '/path/to/admin';
            const adminPath = sitePaths.getAdminPath();
            expect(adminPath).toBe(expectedResult);
        });

        it('returns the base cache path when called with empty string', () => {
            const expectedResult = '/path/to/admin';
            const adminPath = sitePaths.getAdminPath('');
            expect(adminPath).toBe(expectedResult);
        });
    });

    describe('getContentPathIfExists', () => {
        it('returns the content path if it exists', () => {
            const expectedResult = '/path/to/content';
            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            const contentPath = sitePaths.getContentPathIfExists('');
            expect(contentPath).toBe(expectedResult);
        });

        it('throws an error if path does not exist', () => {
            jest.spyOn(fs, 'existsSync').mockReturnValue(false);
            expect(() => sitePaths.getContentPathIfExists('')).toThrow('File "/path/to/content" does not exist');
        });
    });

    describe('getCachePathIfExists', () => {
        it('returns the cache path if it exists', () => {
            const expectedResult = '/path/to/cache';
            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            const cachePath = sitePaths.getCachePathIfExists('');
            expect(cachePath).toBe(expectedResult);
        });

        it('throws an error if path does not exist', () => {
            jest.spyOn(fs, 'existsSync').mockReturnValue(false);
            expect(() => sitePaths.getCachePathIfExists('')).toThrow('File "/path/to/cache" does not exist');
        });
    });

    describe('getAdminPathIfExists', () => {
        it('returns the admin path if it exists', () => {
            const expectedResult = '/path/to/admin';
            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            const adminPath = sitePaths.getAdminPathIfExists('');
            expect(adminPath).toBe(expectedResult);
        });

        it('throws an error if path does not exist', () => {
            jest.spyOn(fs, 'existsSync').mockReturnValue(false);
            expect(() => sitePaths.getAdminPathIfExists('')).toThrow('File "/path/to/admin" does not exist');
        });
    });
});
