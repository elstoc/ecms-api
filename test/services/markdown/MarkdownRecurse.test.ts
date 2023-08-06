/* eslint-disable  @typescript-eslint/no-explicit-any */
import { MarkdownRecurse } from '../../../src/services/markdown/MarkdownRecurse';
import YAML from 'yaml';
import { splitFrontMatter } from '../../../src/utils';

jest.mock('yaml');
jest.mock('../../../src/utils');

const config = {
    dataDir: '/path/to/data',
} as any;

const mockStorage = {
    listContentChildren: jest.fn() as jest.Mock,
    contentFileExists: jest.fn() as jest.Mock,
    getContentFile: jest.fn() as jest.Mock,
    getGeneratedFile: jest.fn() as jest.Mock,
    storeGeneratedFile: jest.fn() as jest.Mock,
    generatedFileIsOlder: jest.fn() as jest.Mock,
    getContentFileModifiedTime: jest.fn() as jest.Mock,
    contentDirectoryExists: jest.fn() as jest.Mock,
    splitPath: jest.fn() as jest.Mock
};

const mockResponse = {
    send: jest.fn() as jest.Mock,
    sendStatus: jest.fn() as jest.Mock
};

const mockYAMLparse = YAML.parse as jest.Mock;
const mockSplitFrontMatter = splitFrontMatter as jest.Mock;

describe('MarkdownRecurse', () => {
    const contentFileBuf = Buffer.from('content-file');

    beforeEach(() => {
        mockStorage.splitPath.mockImplementation((path) => {
            return path
                .replace(/^\//, '')
                .replace(/\/$/, '')
                .split('/');
        });
    });

    describe('sendFile', () => {
        beforeEach(() => {
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
        });

        it('sends 404 for a root object if the object\'s root/index.md file does not exist', async () => {
            mockStorage.contentFileExists.mockReturnValue(false);

            const page = new MarkdownRecurse('path/to/root', config, mockStorage, true);
            await page.sendFile('path/to/root', mockResponse as any);

            expect(mockStorage.contentFileExists).toBeCalledWith('path/to/root/index.md');
            expect(mockResponse.sendStatus).toBeCalledWith(404);
        });

        it('sends 404 for a non-root object if the object\'s api path does not end in md', async () => {
            const page = new MarkdownRecurse('path/to/file', config, mockStorage);
            await page.sendFile('path/to/file', mockResponse as any);

            expect(mockStorage.contentFileExists).not.toBeCalled();
            expect(mockResponse.sendStatus).toBeCalledWith(404);
        });

        it('sends 404 for a non-root object if the object\'s content file does not exist', async () => {
            mockStorage.contentFileExists.mockReturnValue(false);

            const page = new MarkdownRecurse('path/to/file.md', config, mockStorage);
            await page.sendFile('path/to/file.md', mockResponse as any);

            expect(mockStorage.contentFileExists).toBeCalledWith('path/to/file.md');
            expect(mockResponse.sendStatus).toBeCalledWith(404);
        });

        it('sends the index.md content file for a root object where the targetPath matches the first object', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);

            const page = new MarkdownRecurse('path/to/root', config, mockStorage, true);
            await page.sendFile('path/to/root', mockResponse as any);

            expect(mockStorage.getContentFile).toBeCalledWith('path/to/root/index.md');
            expect(mockResponse.send).toBeCalledWith(contentFileBuf);
        });

        it('sends the requested content file for a non-root object where the targetPath matches the first object', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);

            const page = new MarkdownRecurse('path/to/file.md', config, mockStorage);
            await page.sendFile('path/to/file.md', mockResponse as any);

            expect(mockStorage.getContentFile).toBeCalledWith('path/to/file.md');
            expect(mockResponse.send).toBeCalledWith(contentFileBuf);
        });

        it('recurses through objects for a long path and sends the file from the last object', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);

            const page = new MarkdownRecurse('root', config, mockStorage, true);
            await page.sendFile('root/path/to/page.md', mockResponse as any);

            expect(mockStorage.contentFileExists).toBeCalledTimes(4);
            expect(mockStorage.contentFileExists.mock.calls[0][0]).toBe('root/index.md');
            expect(mockStorage.contentFileExists.mock.calls[1][0]).toBe('root/path.md');
            expect(mockStorage.contentFileExists.mock.calls[2][0]).toBe('root/path/to.md');
            expect(mockStorage.contentFileExists.mock.calls[3][0]).toBe('root/path/to/page.md');
            expect(mockStorage.getContentFile).toBeCalledWith('root/path/to/page.md');
            expect(mockResponse.send).toBeCalledWith(contentFileBuf);
        });

        it('sends 404 if any object in the path does not have a markdown file associated with it', async () => {
            mockStorage.contentFileExists.mockImplementation((file) => {
                return !file.endsWith('to.md');
            });

            const page = new MarkdownRecurse('root', config, mockStorage, true);
            await page.sendFile('root/path/to/page.md', mockResponse as any);

            expect(mockStorage.contentFileExists).toBeCalledTimes(3);
            expect(mockStorage.contentFileExists.mock.calls[0][0]).toBe('root/index.md');
            expect(mockStorage.contentFileExists.mock.calls[1][0]).toBe('root/path.md');
            expect(mockStorage.contentFileExists.mock.calls[2][0]).toBe('root/path/to.md');
            expect(mockResponse.send).not.toBeCalled();
            expect(mockResponse.sendStatus).toBeCalledWith(404);
        });
    });

    describe('getMetadata', () => {
        it('throws an error if the content file does not exist for a root object', async () => {
            mockStorage.contentFileExists.mockReturnValue(false);

            const page = new MarkdownRecurse('root', config, mockStorage, true);

            await expect(() => page.getMetadata())
                .rejects.toThrow('No markdown file found matching path root');
            expect(mockStorage.contentFileExists).toBeCalledWith('root/index.md');
        });

        it('throws an error if the path does not end in md for a non-root object', async () => {
            const page = new MarkdownRecurse('root', config, mockStorage);

            await expect(() => page.getMetadata())
                .rejects.toThrow('No markdown file found matching path root');
            expect(mockStorage.contentFileExists).not.toBeCalled();
        });

        it('throws an error if the content file does not exist for a non-root object', async () => {
            mockStorage.contentFileExists.mockReturnValue(false);

            const page = new MarkdownRecurse('root/file.md', config, mockStorage);

            await expect(() => page.getMetadata())
                .rejects.toThrow('No markdown file found matching path root/file.md');
            expect(mockStorage.contentFileExists).toBeCalledWith('root/file.md');
        });

        it('gets metadata from the source file where none is cached', async () => {
            const parsedYaml = { title: 'Some Title' };
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            mockStorage.getContentFileModifiedTime.mockReturnValue(5000);
            mockSplitFrontMatter.mockReturnValue([parsedYaml]);
            mockYAMLparse.mockReturnValue(parsedYaml);

            const page = new MarkdownRecurse('root/file.md', config, mockStorage);
            const actualMetadata = await page.getMetadata();

            const expectedMetadata = {
                apiPath: 'root/file.md',
                title: 'Some Title'
            };
            expect(mockStorage.getContentFileModifiedTime).toBeCalledWith('root/file.md');
            expect(mockStorage.getContentFile).toBeCalledWith('root/file.md');
            expect(mockSplitFrontMatter).toBeCalledWith(contentFileBuf.toString('utf-8'));
            expect(mockYAMLparse).toBeCalledWith(parsedYaml);

            expect(actualMetadata).toEqual(expectedMetadata);
        });

        it('returns identical metadata on the second run without re-reading the source file', async () => {
            const parsedYaml = { title: 'Some Title' };
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            mockStorage.getContentFileModifiedTime.mockReturnValue(5000);
            mockSplitFrontMatter.mockReturnValue([parsedYaml]);
            mockYAMLparse.mockReturnValue(parsedYaml);

            const page = new MarkdownRecurse('root/file.md', config, mockStorage);
            const actualMetadata1 = await page.getMetadata();
            const actualMetadata2 = await page.getMetadata();

            const expectedMetadata = {
                apiPath: 'root/file.md',
                title: 'Some Title'
            };
            expect(mockStorage.getContentFileModifiedTime).toBeCalledTimes(2);
            expect(mockStorage.getContentFile).toBeCalledTimes(1);
            expect(mockSplitFrontMatter).toBeCalledTimes(1);
            expect(mockYAMLparse).toBeCalledTimes(1);

            expect(actualMetadata1).toEqual(expectedMetadata);
            expect(actualMetadata2).toEqual(expectedMetadata);
        });

        it('re-obtains metadata from the source file if it was updated since the last call', async () => {
            const parsedYaml = { title: 'Some Title' };
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            mockStorage.getContentFileModifiedTime
                .mockReturnValueOnce(5000)
                .mockReturnValue(6000);
            mockSplitFrontMatter.mockReturnValue([parsedYaml]);
            mockYAMLparse.mockReturnValue(parsedYaml);

            const page = new MarkdownRecurse('root/file.md', config, mockStorage);
            const actualMetadata1 = await page.getMetadata();
            const actualMetadata2 = await page.getMetadata();

            const expectedMetadata = {
                apiPath: 'root/file.md',
                title: 'Some Title'
            };
            expect(mockStorage.getContentFileModifiedTime).toBeCalledTimes(2);
            expect(mockStorage.getContentFile).toBeCalledTimes(2);
            expect(mockSplitFrontMatter).toBeCalledTimes(2);
            expect(mockYAMLparse).toBeCalledTimes(2);

            expect(actualMetadata1).toEqual(expectedMetadata);
            expect(actualMetadata2).toEqual(expectedMetadata);
        });

        it('sets the title to the file/path name (without extension) if not present in parsed metadata', async () => {
            const parsedYaml = { };
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            mockStorage.getContentFileModifiedTime.mockReturnValue(5000);
            mockSplitFrontMatter.mockReturnValue([parsedYaml]);
            mockYAMLparse.mockReturnValue(parsedYaml);

            const page = new MarkdownRecurse('root/file.md', config, mockStorage);
            const actualMetadata = await page.getMetadata();

            const expectedMetadata = {
                apiPath: 'root/file.md',
                title: 'file'
            };
            expect(mockStorage.getContentFileModifiedTime).toBeCalledWith('root/file.md');
            expect(mockStorage.getContentFile).toBeCalledWith('root/file.md');
            expect(mockSplitFrontMatter).toBeCalledWith(contentFileBuf.toString('utf-8'));
            expect(mockYAMLparse).toBeCalledWith(parsedYaml);

            expect(actualMetadata).toEqual(expectedMetadata);
        });
    });

    describe('getMdStructure', () => {

        beforeEach(() => {
            mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
        });

        it('throws an error if the content file does not exist for a root object', async () => {
            mockStorage.contentFileExists.mockReturnValue(false);

            const page = new MarkdownRecurse('root', config, mockStorage, true);

            await expect(() => page.getMdStructure())
                .rejects.toThrow('No markdown file found matching path root');
            expect(mockStorage.contentFileExists).toBeCalledWith('root/index.md');
        });

        it('throws an error if the path does not end in md for a non-root object', async () => {
            const page = new MarkdownRecurse('root', config, mockStorage);

            await expect(() => page.getMdStructure())
                .rejects.toThrow('No markdown file found matching path root');
            expect(mockStorage.contentFileExists).not.toBeCalled();
        });

        it('throws an error if the content file does not exist for a non-root object', async () => {
            mockStorage.contentFileExists.mockReturnValue(false);

            const page = new MarkdownRecurse('root/file.md', config, mockStorage);

            await expect(() => page.getMdStructure())
                .rejects.toThrow('No markdown file found matching path root/file.md');
            expect(mockStorage.contentFileExists).toBeCalledWith('root/file.md');
        });

        it('root: lists root page as first child, removes index.md and non-md files from child list', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            mockStorage.listContentChildren.mockImplementation(async (directory, filterFn) => {
                if (directory === 'rootDir') {
                    return ['notmarkdown.mdd', 'markdown1.md', 'markdown2.md', 'noextension', 'index.md']
                        .filter(filterFn);
                }
                return [];
            });
            mockSplitFrontMatter.mockReturnValue(['']);
            mockYAMLparse.mockReturnValue({});

            const page = new MarkdownRecurse('rootDir', config, mockStorage, true);

            const expectedStructure = {
                children: [
                    { metadata: { title: 'rootDir', apiPath: 'rootDir' } },
                    { metadata: { title: 'markdown1', apiPath: 'rootDir/markdown1.md' } },
                    { metadata: { title: 'markdown2', apiPath: 'rootDir/markdown2.md' } }
                ]
            };
            const structure = await page.getMdStructure();
            expect(structure).toStrictEqual(expectedStructure);
        });

        it('non-root: lists main page and then children with non-md and index.md removed', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            mockStorage.listContentChildren.mockImplementation(async (directory, filterFn) => {
                if (directory === 'rootDir') {
                    return ['notmarkdown.mdd', 'markdown1.md', 'markdown2.md', 'noextension', 'index.md']
                        .filter(filterFn);
                }
                return [];
            });
            mockSplitFrontMatter.mockReturnValue(['']);
            mockYAMLparse.mockReturnValue({});

            const page = new MarkdownRecurse('rootDir.md', config, mockStorage, false);

            const expectedStructure = {
                metadata: { title: 'rootDir', apiPath: 'rootDir.md' },
                children: [
                    { metadata: { title: 'markdown1', apiPath: 'rootDir/markdown1.md' } },
                    { metadata: { title: 'markdown2', apiPath: 'rootDir/markdown2.md' } }
                ]
            };
            const structure = await page.getMdStructure();
            expect(structure).toStrictEqual(expectedStructure);
        });

        it('returns index file metadata as a single child for a root directory with no (other) children', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            mockStorage.listContentChildren.mockResolvedValue([]);
            mockSplitFrontMatter.mockReturnValue(['']);
            mockYAMLparse.mockReturnValue({});

            const page = new MarkdownRecurse('rootDir', config, mockStorage, true);

            const expectedStructure = {
                children: [{ metadata: { title: 'rootDir', apiPath: 'rootDir' } } ]
            };
            const structure = await page.getMdStructure();
            expect(structure).toStrictEqual(expectedStructure);
        });

        it('returns a single metadata item for a non-root page with no children', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            mockStorage.listContentChildren.mockResolvedValue([]);
            mockSplitFrontMatter.mockReturnValue(['']);
            mockYAMLparse.mockReturnValue({});

            const page = new MarkdownRecurse('rootDir/page.md', config, mockStorage);

            const expectedStructure = {
                metadata: { title: 'page', apiPath: 'rootDir/page.md' }
            };
            const structure = await page.getMdStructure();
            expect(structure).toStrictEqual(expectedStructure);
        });

        it('orders non-root children by weight (ascending) first and then by title (ascending)', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.getContentFile.mockImplementation((path) => Buffer.from(path));
            mockStorage.listContentChildren.mockImplementation((path) => {
                if (path.endsWith('rootDir'))
                    return ['fileA.md', 'fileB.md', 'fileC.md', 'fileD.md', 'fileE.md', 'fileF.md'];
                return [];
            });
            mockSplitFrontMatter.mockImplementation((path) => [path]);
            mockYAMLparse.mockImplementation((path) => {
                if (path.endsWith('C.md')) return { weight: 10 };
                if (path.endsWith('B.md')) return { weight: 20 };
                if (path.endsWith('A.md')) return { weight: 30 };
                return {};
            });

            const page = new MarkdownRecurse('rootDir.md', config, mockStorage);
            const actualStructure = await page.getMdStructure();

            const expectedStructure = {
                metadata: { title: 'rootDir', apiPath: 'rootDir.md' },
                children: [
                    { metadata: { title: 'fileC', apiPath: 'rootDir/fileC.md', weight: 10 } },
                    { metadata: { title: 'fileB', apiPath: 'rootDir/fileB.md', weight: 20 } },
                    { metadata: { title: 'fileA', apiPath: 'rootDir/fileA.md', weight: 30 } },
                    { metadata: { title: 'fileD', apiPath: 'rootDir/fileD.md' } },
                    { metadata: { title: 'fileE', apiPath: 'rootDir/fileE.md' } },
                    { metadata: { title: 'fileF', apiPath: 'rootDir/fileF.md' } },
                ]
            };
            expect(actualStructure).toEqual(expectedStructure);
        });

        it('orders root children with index.md first, then by weight (ascending) and then by title (ascending)', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.getContentFile.mockImplementation((path) => Buffer.from(path));
            mockStorage.listContentChildren.mockImplementation((path) => {
                if (path.endsWith('rootDir'))
                    return ['fileA.md', 'fileB.md', 'fileC.md', 'fileD.md', 'fileE.md', 'fileF.md'];
                return [];
            });
            mockSplitFrontMatter.mockImplementation((path) => [path]);
            mockYAMLparse.mockImplementation((path) => {
                if (path.endsWith('C.md')) return { weight: 10 };
                if (path.endsWith('B.md')) return { weight: 20 };
                if (path.endsWith('A.md')) return { weight: 30 };
                return {};
            });

            const page = new MarkdownRecurse('rootDir', config, mockStorage, true);
            const actualStructure = await page.getMdStructure();

            const expectedStructure = {
                children: [
                    { metadata: { title: 'rootDir', apiPath: 'rootDir' } },
                    { metadata: { title: 'fileC', apiPath: 'rootDir/fileC.md', weight: 10 } },
                    { metadata: { title: 'fileB', apiPath: 'rootDir/fileB.md', weight: 20 } },
                    { metadata: { title: 'fileA', apiPath: 'rootDir/fileA.md', weight: 30 } },
                    { metadata: { title: 'fileD', apiPath: 'rootDir/fileD.md' } },
                    { metadata: { title: 'fileE', apiPath: 'rootDir/fileE.md' } },
                    { metadata: { title: 'fileF', apiPath: 'rootDir/fileF.md' } },
                ]
            };
            expect(actualStructure).toEqual(expectedStructure);
        });

        it('returns correct data for a complex deep directory structure', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.getContentFile.mockImplementation((path) => Buffer.from(path));
            mockStorage.listContentChildren.mockImplementation((path) => {
                if (path.endsWith('rootDir')) {
                    return ['file1.md', 'file2.md', 'firstDir.md'];
                } else if (path.endsWith('firstDir')) {
                    return ['firstSubDir.md', 'file3.md', 'file4.md'];
                } else if (path.endsWith('firstSubDir')) {
                    return ['file5.md', 'file6.md', 'secondSubDir.md'];
                } else if (path.endsWith('secondSubDir')) {
                    return ['file7.md', 'file8.md', 'file9.md'];
                }
                return [];
            });
            mockSplitFrontMatter.mockImplementation((path) => [path]);
            mockYAMLparse.mockImplementation((path) => {
                if (path.endsWith('C.md')) return { weight: 10 };
                if (path.endsWith('B.md')) return { weight: 20 };
                if (path.endsWith('A.md')) return { weight: 30 };
                return {};
            });

            const page = new MarkdownRecurse('rootDir', config, mockStorage, true);
            const actualStructure = await page.getMdStructure();

            const expectedStructure = {
                children: [
                    { metadata: { title: 'rootDir', apiPath: 'rootDir' } },
                    { metadata: { title: 'file1', apiPath: 'rootDir/file1.md' } },
                    { metadata: { title: 'file2', apiPath: 'rootDir/file2.md' } },
                    {
                        metadata: { title: 'firstDir', apiPath: 'rootDir/firstDir.md' },
                        children: [
                            { metadata: { title: 'file3', apiPath: 'rootDir/firstDir/file3.md' } },
                            { metadata: { title: 'file4', apiPath: 'rootDir/firstDir/file4.md' } },
                            {
                                metadata: { title: 'firstSubDir', apiPath: 'rootDir/firstDir/firstSubDir.md' },
                                children: [
                                    { metadata: { title: 'file5', apiPath: 'rootDir/firstDir/firstSubDir/file5.md' } },
                                    { metadata: { title: 'file6', apiPath: 'rootDir/firstDir/firstSubDir/file6.md' } },
                                    {
                                        metadata: { title: 'secondSubDir', apiPath: 'rootDir/firstDir/firstSubDir/secondSubDir.md' },
                                        children: [
                                            { metadata: { title: 'file7', apiPath: 'rootDir/firstDir/firstSubDir/secondSubDir/file7.md' } },
                                            { metadata: { title: 'file8', apiPath: 'rootDir/firstDir/firstSubDir/secondSubDir/file8.md' } },
                                            { metadata: { title: 'file9', apiPath: 'rootDir/firstDir/firstSubDir/secondSubDir/file9.md' } },
                                        ]
                                    },
                                ]
                            },
                        ]
                    },
                ]
            };
            expect(actualStructure).toEqual(expectedStructure);
        });
    });
});
