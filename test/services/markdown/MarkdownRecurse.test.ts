/* eslint-disable  @typescript-eslint/no-explicit-any */
import { MarkdownRecurse } from '../../../src/services/markdown/MarkdownRecurse';
import YAML from 'yaml';
import { splitFrontMatter } from '../../../src/utils/markdown/splitFrontMatter';

jest.mock('yaml');
jest.mock('../../../src/utils/markdown/splitFrontMatter');

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
    getAdminFile: jest.fn() as jest.Mock,
    storeAdminFile: jest.fn() as jest.Mock,
    getAdminFileModifiedTime: jest.fn() as jest.Mock,
};

const mockYAMLparse = YAML.parse as jest.Mock;
const mockSplitFrontMatter = splitFrontMatter as jest.Mock;

describe('MarkdownRecurse', () => {
    const contentFileBuf = Buffer.from('content-file');

    describe('getFile', () => {
        beforeEach(() => {
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
        });

        it('throws error for a root object if the object\'s root/index.md file does not exist', async () => {
            mockStorage.contentFileExists.mockReturnValue(false);

            const page = new MarkdownRecurse('path/to/root', config, mockStorage, true);
            await expect(page.getFile('path/to/root')).rejects.toThrow();

            expect(mockStorage.contentFileExists).toBeCalledWith('path/to/root/index.md');
        });

        it('throws error for a non-root object if the object\'s api path does not end in md', async () => {
            const page = new MarkdownRecurse('path/to/file', config, mockStorage);
            await expect(page.getFile('path/to/file')).rejects.toThrow();

            expect(mockStorage.contentFileExists).not.toBeCalled();
        });

        it('throws error for a non-root object if the object\'s content file does not exist', async () => {
            mockStorage.contentFileExists.mockReturnValue(false);

            const page = new MarkdownRecurse('path/to/file.md', config, mockStorage);
            await expect(page.getFile('path/to/file.md')).rejects.toThrow();

            expect(mockStorage.contentFileExists).toBeCalledWith('path/to/file.md');
        });

        it('gets the index.md content file for a root object where the targetPath matches the first object', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);

            const page = new MarkdownRecurse('path/to/root', config, mockStorage, true);
            const actualFileBuf = await page.getFile('path/to/root');

            expect(mockStorage.getContentFile).toBeCalledWith('path/to/root/index.md');
            expect(actualFileBuf).toBe(contentFileBuf);
        });

        it('gets the requested content file for a non-root object where the targetPath matches the first object', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);

            const page = new MarkdownRecurse('path/to/file.md', config, mockStorage);
            const actualFileBuf = await page.getFile('path/to/file.md');

            expect(mockStorage.getContentFile).toBeCalledWith('path/to/file.md');
            expect(actualFileBuf).toBe(contentFileBuf);
        });

        it('recurses through objects for a long path and gets the file from the last object', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);

            const page = new MarkdownRecurse('root', config, mockStorage, true);
            const actualFileBuf = await page.getFile('root/path/to/page.md');

            expect(mockStorage.contentFileExists).toBeCalledTimes(4);
            expect(mockStorage.contentFileExists.mock.calls[0][0]).toBe('root/index.md');
            expect(mockStorage.contentFileExists.mock.calls[1][0]).toBe('root/path.md');
            expect(mockStorage.contentFileExists.mock.calls[2][0]).toBe('root/path/to.md');
            expect(mockStorage.contentFileExists.mock.calls[3][0]).toBe('root/path/to/page.md');
            expect(mockStorage.getContentFile).toBeCalledWith('root/path/to/page.md');
            expect(actualFileBuf).toBe(contentFileBuf);
        });

        it('throws error if any object in the path does not have a markdown file associated with it', async () => {
            mockStorage.contentFileExists.mockImplementation((file) => {
                return !file.endsWith('to.md');
            });

            const page = new MarkdownRecurse('root', config, mockStorage, true);
            await expect(page.getFile('root/path/to/page.md')).rejects.toThrow();

            expect(mockStorage.contentFileExists).toBeCalledTimes(3);
            expect(mockStorage.contentFileExists.mock.calls[0][0]).toBe('root/index.md');
            expect(mockStorage.contentFileExists.mock.calls[1][0]).toBe('root/path.md');
            expect(mockStorage.contentFileExists.mock.calls[2][0]).toBe('root/path/to.md');
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
                title: 'Some Title',
                additionalData: {}
            };
            expect(mockStorage.getContentFileModifiedTime).toBeCalledWith('root/file.md');
            expect(mockStorage.getContentFile).toBeCalledWith('root/file.md');
            expect(mockSplitFrontMatter).toBeCalledWith(contentFileBuf.toString('utf-8'));
            expect(mockYAMLparse).toBeCalledWith(parsedYaml);

            expect(actualMetadata).toEqual(expectedMetadata);
        });

        it('places unknown metadata into additionalData', async () => {
            const parsedYaml = {
                title: 'Some Title',
                someOtherField: 'some-other-value',
                someDifferentField: 'some-different-value'
            };
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            mockStorage.getContentFileModifiedTime.mockReturnValue(5000);
            mockSplitFrontMatter.mockReturnValue([parsedYaml]);
            mockYAMLparse.mockReturnValue(parsedYaml);

            const page = new MarkdownRecurse('root/file.md', config, mockStorage);
            const actualMetadata = await page.getMetadata();

            const expectedMetadata = {
                apiPath: 'root/file.md',
                title: 'Some Title',
                additionalData: {
                    someOtherField: 'some-other-value',
                    someDifferentField: 'some-different-value'
                }
            };
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
                title: 'Some Title',
                additionalData: {}
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
                title: 'Some Title',
                additionalData: {}
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
                title: 'file',
                additionalData: {}
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
                    { title: 'rootDir', apiPath: 'rootDir', additionalData: {} } ,
                    { title: 'markdown1', apiPath: 'rootDir/markdown1.md', additionalData: {} },
                    { title: 'markdown2', apiPath: 'rootDir/markdown2.md', additionalData: {} }
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
                title: 'rootDir', apiPath: 'rootDir.md', additionalData: {},
                children: [
                    { title: 'markdown1', apiPath: 'rootDir/markdown1.md', additionalData: {} },
                    { title: 'markdown2', apiPath: 'rootDir/markdown2.md', additionalData: {} }
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
                children: [{ title: 'rootDir', apiPath: 'rootDir', additionalData: {} } ]
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

            const expectedStructure = { title: 'page', apiPath: 'rootDir/page.md', additionalData: {} };
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
                title: 'rootDir', apiPath: 'rootDir.md', additionalData: {},
                children: [
                    { title: 'fileC', apiPath: 'rootDir/fileC.md', weight: 10, additionalData: {} },
                    { title: 'fileB', apiPath: 'rootDir/fileB.md', weight: 20, additionalData: {} },
                    { title: 'fileA', apiPath: 'rootDir/fileA.md', weight: 30, additionalData: {} },
                    { title: 'fileD', apiPath: 'rootDir/fileD.md', additionalData: {} },
                    { title: 'fileE', apiPath: 'rootDir/fileE.md', additionalData: {} },
                    { title: 'fileF', apiPath: 'rootDir/fileF.md', additionalData: {} },
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
                    { title: 'rootDir', apiPath: 'rootDir', additionalData: {} },
                    { title: 'fileC', apiPath: 'rootDir/fileC.md', weight: 10, additionalData: {} },
                    { title: 'fileB', apiPath: 'rootDir/fileB.md', weight: 20, additionalData: {} },
                    { title: 'fileA', apiPath: 'rootDir/fileA.md', weight: 30, additionalData: {} },
                    { title: 'fileD', apiPath: 'rootDir/fileD.md', additionalData: {} },
                    { title: 'fileE', apiPath: 'rootDir/fileE.md', additionalData: {} },
                    { title: 'fileF', apiPath: 'rootDir/fileF.md', additionalData: {} },
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
                    { title: 'rootDir', apiPath: 'rootDir', additionalData: {} },
                    { title: 'file1', apiPath: 'rootDir/file1.md', additionalData: {} },
                    { title: 'file2', apiPath: 'rootDir/file2.md', additionalData: {} },
                    {
                        title: 'firstDir', apiPath: 'rootDir/firstDir.md', additionalData: {},
                        children: [
                            { title: 'file3', apiPath: 'rootDir/firstDir/file3.md', additionalData: {} },
                            { title: 'file4', apiPath: 'rootDir/firstDir/file4.md', additionalData: {} },
                            {
                                title: 'firstSubDir', apiPath: 'rootDir/firstDir/firstSubDir.md', additionalData: {},
                                children: [
                                    { title: 'file5', apiPath: 'rootDir/firstDir/firstSubDir/file5.md', additionalData: {} },
                                    { title: 'file6', apiPath: 'rootDir/firstDir/firstSubDir/file6.md', additionalData: {} },
                                    {
                                        title: 'secondSubDir', apiPath: 'rootDir/firstDir/firstSubDir/secondSubDir.md', additionalData: {},
                                        children: [
                                            { title: 'file7', apiPath: 'rootDir/firstDir/firstSubDir/secondSubDir/file7.md', additionalData: {} },
                                            { title: 'file8', apiPath: 'rootDir/firstDir/firstSubDir/secondSubDir/file8.md', additionalData: {} },
                                            { title: 'file9', apiPath: 'rootDir/firstDir/firstSubDir/secondSubDir/file9.md', additionalData: {} },
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
