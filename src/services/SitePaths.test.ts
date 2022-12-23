/* eslint-disable  @typescript-eslint/no-explicit-any */
import { SitePaths } from './SitePaths';
import fs from 'fs';

jest.mock('fs');

const config = {
    cacheDir: '/path/to/cache',
    contentDir: '/path/to/content'
} as any;

describe('That SitePaths.getCachePath', () => {
    it('attempts to resolve a cache path correctly', () => {
        const expectedResult = '/path/to/cache/path/to/required/file';
        const sitePaths = new SitePaths(config);
        const cachePath = sitePaths.getCachePath('path', 'to', 'required', 'file');
        expect(cachePath).toBe(expectedResult);
    });

    it('returns the base cache path when called with no parameters', () => {
        const expectedResult = '/path/to/cache';
        const sitePaths = new SitePaths(config);
        const cachePath = sitePaths.getCachePath();
        expect(cachePath).toBe(expectedResult);
    });

    it('returns the base cache path when called with empty string', () => {
        const expectedResult = '/path/to/cache';
        const sitePaths = new SitePaths(config);
        const cachePath = sitePaths.getCachePath('');
        expect(cachePath).toBe(expectedResult);
    });
});

describe('That SitePaths.getContentPath', () => {
    it('attempts to resolve a content path correctly', () => {
        const expectedResult = '/path/to/content/path/to/required/file';
        const sitePaths = new SitePaths(config);
        const contentPath = sitePaths.getContentPath('path', 'to', 'required', 'file');
        expect(contentPath).toBe(expectedResult);
    });

    it('returns the base content path when called with no parameters', () => {
        const expectedResult = '/path/to/content';
        const sitePaths = new SitePaths(config);
        const contentPath = sitePaths.getContentPath();
        expect(contentPath).toBe(expectedResult);
    });

    it('returns the base content path when called with empty string', () => {
        const expectedResult = '/path/to/content';
        const sitePaths = new SitePaths(config);
        const contentPath = sitePaths.getContentPath('');
        expect(contentPath).toBe(expectedResult);
    });
});

describe('That SitePaths.getContentPathIfExists', () => {
    it('returns the content path if it exists', () => {
        const expectedResult = '/path/to/content';
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        const sitePaths = new SitePaths(config);
        const contentPath = sitePaths.getContentPathIfExists('');
        expect(contentPath).toBe(expectedResult);
    });

    it('throws an error if path does not exist', () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(false);
        const sitePaths = new SitePaths(config);
        expect(() => sitePaths.getContentPathIfExists('')).toThrow('File "/path/to/content" does not exist');
    });
});

describe('That SitePaths.getCachePathIfExists', () => {
    it('returns the cache path if it exists', () => {
        const expectedResult = '/path/to/cache';
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        const sitePaths = new SitePaths(config);
        const cachePath = sitePaths.getCachePathIfExists('');
        expect(cachePath).toBe(expectedResult);
    });

    it('throws an error if path does not exist', () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(false);
        const sitePaths = new SitePaths(config);
        expect(() => sitePaths.getCachePathIfExists('')).toThrow('File "/path/to/cache" does not exist');
    });
});
