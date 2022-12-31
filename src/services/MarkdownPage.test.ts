/* eslint-disable  @typescript-eslint/no-explicit-any */
import fs from 'fs';
import YAML from 'yaml';

import { SitePaths } from './SitePaths';
import { splitFrontMatter } from '../utils/splitFrontMatter';
import { MarkdownPage } from './MarkdownPage';

jest.mock('yaml');

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    statSync: jest.fn(),
    promises: {
        readFile: jest.fn()
    }
}));

jest.mock('../utils/splitFrontMatter');

const config = {
    cacheDir: '/path/to/cache',
    contentDir: '/path/to/content'
} as any;

describe('That MarkdownPage.getContentPath', () => {
    let sitePaths: SitePaths;

    beforeEach(() => {
        sitePaths = new SitePaths(config);
    });

    it.each([
        '',
        '/'
    ])('returns the root index markdown file if passed %p', (inPath) => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });

        const page = new MarkdownPage(sitePaths, inPath);
        const actualPath = page.getContentPath();
        const expectedPath = '/path/to/content/index.md';

        expect(actualPath).toBe(expectedPath);
    });

    it.each([
        'path/to/dir',
        '/path/to/dir'
    ])('returns the index markdown file if passed a valid directory %p', (inPath) => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });

        const page = new MarkdownPage(sitePaths, inPath);
        const actualPath = page.getContentPath();
        const expectedPath = '/path/to/content/path/to/dir/index.md';

        expect(actualPath).toBe(expectedPath);
    });

    it('appends .md to the path if passed a non-existent file', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => false });

        const page = new MarkdownPage(sitePaths, '/path/to/file');
        const actualPath = page.getContentPath();
        const expectedPath = '/path/to/content/path/to/file.md';

        expect(actualPath).toBe(expectedPath);
    });

    it('appends .md to the path if passed an existing file (not a directory)', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => false });

        const page = new MarkdownPage(sitePaths, '/path/to/file');
        const actualPath = page.getContentPath();
        const expectedPath = '/path/to/content/path/to/file.md';

        expect(actualPath).toBe(expectedPath);
    });
});

describe('That MarkdownPage.getMetadata', () => {
    let sitePaths: SitePaths;

    beforeEach(() => {
        sitePaths = new SitePaths(config);
        (fs.statSync as jest.Mock).mockReturnValue({ mtimeMs: 1234, isDirectory: () => false });
        (fs.promises.readFile as jest.Mock).mockResolvedValue('file contents');
        (splitFrontMatter as jest.Mock).mockReturnValue(['yaml','content']);
        (YAML.parse as jest.Mock).mockReturnValue({ title: 'The Title' });
    });

    it('Attempts to parse front matter the first time it is called (check all call params)', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        const page = new MarkdownPage(sitePaths, 'path/to/file');
        const expectedPageMeta = {
            uiPath: 'path/to/file',
            title: 'The Title'
        };
        const pageMeta = await page.getMetadata();
        expect(splitFrontMatter).toBeCalledTimes(1);
        const yamlCallParam = (splitFrontMatter as jest.Mock).mock.calls[0][0];
        const yamlParseParam = (YAML.parse as jest.Mock).mock.calls[0][0];
        const readFileCallParams = (fs.promises.readFile as jest.Mock).mock.calls[0];
        expect(readFileCallParams).toEqual(['/path/to/content/path/to/file.md','utf-8']);
        expect(yamlCallParam).toBe('file contents');
        expect(yamlParseParam).toBe('yaml');
        expect(pageMeta).toStrictEqual(expectedPageMeta);
    });

    it('Does not attempt to parse front matter the second time it is called', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        const page = new MarkdownPage(sitePaths, 'path/to/file');
        const expectedPageMeta = {
            uiPath: 'path/to/file',
            title: 'The Title'
        };
        await page.getMetadata();
        const pageMeta = await page.getMetadata();
        expect(splitFrontMatter).toBeCalledTimes(1);
        expect(pageMeta).toStrictEqual(expectedPageMeta);
    });

    it('Attempts to re-parse front matter if file becomes out of date', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);

        const page = new MarkdownPage(sitePaths, 'path/to/file');
        await page.getMetadata();

        (fs.statSync as jest.Mock).mockReturnValue({ mtimeMs: 9999, isDirectory: () => false });
        (YAML.parse as jest.Mock).mockReturnValue({ title: 'The New Title' });

        const expectedPageMeta = {
            uiPath: 'path/to/file',
            title: 'The New Title'
        };
        const pageMeta = await page.getMetadata();
        expect(splitFrontMatter).toBeCalledTimes(2);
        expect(pageMeta).toStrictEqual(expectedPageMeta);
    });

    it('Returns basename of relPath if called on non-existing markdown file', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        const page = new MarkdownPage(sitePaths, 'path/to/file');
        const expectedPageMeta = {
            uiPath: 'path/to/file',
            title: 'file'
        };
        const pageMeta = await page.getMetadata();
        expect(splitFrontMatter).toBeCalledTimes(0);
        expect(pageMeta).toStrictEqual(expectedPageMeta);
    });

});
