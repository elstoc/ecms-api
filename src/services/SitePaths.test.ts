/* eslint-disable  @typescript-eslint/no-explicit-any */
import { SitePaths } from './SitePaths';

const config = {
    cacheDir: '/path/to/cache',
    contentDir: '/path/to/content'
} as any;

describe('That SitePaths', () => {
    it('Attempts to resolve a cache path correctly', () => {
        const expectedResult = '/path/to/cache/path/to/required/file';
        const sitePaths = new SitePaths(config);
        const cachePath = sitePaths.getCachePath('path', 'to', 'required', 'file');
        expect(cachePath).toBe(expectedResult);
    });

    it('Attempts to resolve a content path correctly', () => {
        const expectedResult = '/path/to/content/path/to/required/file';
        const sitePaths = new SitePaths(config);
        const contentPath = sitePaths.getContentPath('path', 'to', 'required', 'file');
        expect(contentPath).toBe(expectedResult);
    });

    it('Returns the base content path when called with no parameters', () => {
        const expectedResult = '/path/to/content';
        const sitePaths = new SitePaths(config);
        const contentPath = sitePaths.getContentPath();
        expect(contentPath).toBe(expectedResult);
    });

    it('Returns the base content path when called with empty string', () => {
        const expectedResult = '/path/to/content';
        const sitePaths = new SitePaths(config);
        const contentPath = sitePaths.getContentPath('');
        expect(contentPath).toBe(expectedResult);
    });

    it('Returns the base cache path when called with no parameters', () => {
        const expectedResult = '/path/to/cache';
        const sitePaths = new SitePaths(config);
        const cachePath = sitePaths.getCachePath();
        expect(cachePath).toBe(expectedResult);
    });

    it('Returns the base content path when called with empty string', () => {
        const expectedResult = '/path/to/content';
        const sitePaths = new SitePaths(config);
        const contentPath = sitePaths.getContentPath('');
        expect(contentPath).toBe(expectedResult);
    });
});
