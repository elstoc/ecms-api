/* eslint-disable  @typescript-eslint/no-explicit-any */

import fs from 'fs';

import { MarkdownPage } from './MarkdownPage';
import { SitePaths } from '../site';
import { Markdown } from './Markdown';

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    statSync: jest.fn(),
    promises: {
        readdir: jest.fn()
    }
}));

jest.mock('./MarkdownPage');

const config = {
    cacheDir: '/path/to/cache',
    contentDir: '/path/to/content'
} as any;

describe('That Markdown.getSourcePath', () => {
    let sitePaths: SitePaths;
    let markdown: Markdown;

    beforeEach(() => {
        sitePaths = new SitePaths(config);
        markdown = new Markdown(sitePaths);
        (fs.existsSync as jest.Mock).mockReturnValue(true);
    });

    it('Only creates MarkdownPage instances for files it has not seen before', () => {
        markdown.getSourcePath('/path/to/file1');
        markdown.getSourcePath('/path/to/file2');
        markdown.getSourcePath('/path/to/file3');
        markdown.getSourcePath('/path/to/file1');
        markdown.getSourcePath('/path/to/file2');
        expect(MarkdownPage).toBeCalledTimes(3);
    });

    it('executes getContentPath on MarkdownPage', () => {
        (MarkdownPage as jest.Mock).mockImplementation((_, uiPath) => ({
            getContentPath: () => `/path/to/content/${uiPath}`
        }));

        const path = markdown.getSourcePath('path/to/file');
        expect(path).toBe('/path/to/content/path/to/file');
    });
});

describe('That Markdown.getNavData', () => {
    let sitePaths: SitePaths;
    let markdown: Markdown;

    beforeEach(() => {
        sitePaths = new SitePaths(config);
        markdown = new Markdown(sitePaths);

        (MarkdownPage as jest.Mock).mockImplementation((_, uiPath) => ({
            getMetadata: () => ({ path: uiPath })
        }));

    });

    it('Correctly handles a single directory full of markdown files (and ignores jpg and index files)', async () => {
        (fs.promises.readdir as jest.Mock).mockResolvedValue(([
            'file1.md',
            'file2.md',
            'index.md',
            'file3.jpg',
            'file3.md'
        ]));
        (fs.existsSync as jest.Mock).mockImplementation((filePath) => !filePath.endsWith('.jpg.md'));
        (fs.statSync as jest.Mock).mockImplementation((filePath) => ({
            isDirectory: () => (filePath.endsWith('dir') ? true : false)
        }));

        const expectedResult = {
            meta: { path: 'path/to/dir' },
            children: [
                { meta: { path: 'path/to/dir/file1' } },
                { meta: { path: 'path/to/dir/file2' } },
                { meta: { path: 'path/to/dir/file3' } },
            ]
        };

        const metadata = await markdown.getNavData('path/to/dir');
        expect(metadata).toStrictEqual(expectedResult);
    });

    it('Manages multi-level directories', async () => {
        (fs.promises.readdir as jest.Mock).mockImplementation(async (dirName) => {
            if (dirName.endsWith('0dir')) {
                return [
                    'file1.md',
                    'file2.md',
                    'index.md',
                    'file3.jpg',
                    '1dir',
                    '2dir'
                ];
            } else if (dirName.endsWith('1dir')) {
                return [
                    'file4.md',
                    'file5.md'
                ];
            } else if (dirName.endsWith('2dir')) {
                return [
                    'file6.md',
                    'index.md',
                    '3dir'
                ];
            } else {
                return [
                    'file7.md',
                    'index.md'
                ];
            }
        });

        (fs.existsSync as jest.Mock).mockImplementation((filePath) => !filePath.endsWith('.jpg.md'));

        (fs.statSync as jest.Mock).mockImplementation((filePath) => ({
            isDirectory: () => (filePath.endsWith('dir') ? true : false)
        }));

        const expectedResult = {
            meta: { path: 'path/to/0dir' },
            children: [
                { meta: { path: 'path/to/0dir/file1' } },
                { meta: { path: 'path/to/0dir/file2' } },
                {
                    meta: { path: 'path/to/0dir/1dir' },
                    children: [
                        { meta: { path: 'path/to/0dir/1dir/file4' } },
                        { meta: { path: 'path/to/0dir/1dir/file5' } },
                    ]
                },
                {
                    meta: { path: 'path/to/0dir/2dir' },
                    children: [
                        { meta: { path: 'path/to/0dir/2dir/file6' } },
                        {
                            meta: { path: 'path/to/0dir/2dir/3dir' },
                            children: [
                                { meta: { path: 'path/to/0dir/2dir/3dir/file7' } }
                            ]
                        },
                    ]
                },
            ]
        };

        const metadata = await markdown.getNavData('path/to/0dir');
        expect(metadata).toStrictEqual(expectedResult);
    });
});
