/* eslint-disable  @typescript-eslint/no-explicit-any */
import { Markdown } from '../../../src/services/markdown/Markdown';
import YAML from 'yaml';
import { splitFrontMatter } from '../../../src/utils/markdown/splitFrontMatter';
import { NotFoundError, NotPermittedError } from '../../../src/errors';

jest.mock('yaml');
jest.mock('../../../src/utils/markdown/splitFrontMatter');

const config = {
    dataDir: '/path/to/data',
    enableAuthentication: true
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
    storeContentFile: jest.fn() as jest.Mock,
};

const mockYAMLparse = YAML.parse as jest.Mock;
const mockSplitFrontMatter = splitFrontMatter as jest.Mock;

describe('Markdown', () => {
    const contentFile = 'content-file';
    const contentFileBuf = Buffer.from(contentFile);

    describe('getPage', () => {
        beforeEach(() => {
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            mockStorage.listContentChildren.mockResolvedValue([]);
            const parsedYaml = { title: 'Some Title' };
            mockSplitFrontMatter.mockReturnValue([parsedYaml]);
            mockYAMLparse.mockReturnValue(parsedYaml);
        });

        describe('throws error', () => {
            it('for a root object if the object\'s root/index.md file does not exist', async () => {
                mockStorage.contentFileExists.mockReturnValue(false);
    
                const page = new Markdown('path/to/root', config, mockStorage, true);
                await expect(page.getPage('path/to/root')).rejects.toThrow(NotFoundError);
    
                expect(mockStorage.contentFileExists).toBeCalledWith('path/to/root/index.md');
            });
    
            it('for a non-root object if the object\'s api path does not end in md', async () => {
                const page = new Markdown('path/to/file', config, mockStorage);
                await expect(page.getPage('path/to/file')).rejects.toThrow(NotFoundError);
    
                expect(mockStorage.contentFileExists).not.toBeCalled();
            });
    
            it('for a non-root object if the object\'s content file does not exist', async () => {
                mockStorage.contentFileExists.mockReturnValue(false);
    
                const page = new Markdown('path/to/file.md', config, mockStorage);
                await expect(page.getPage('path/to/file.md')).rejects.toThrow(NotFoundError);
    
                expect(mockStorage.contentFileExists).toBeCalledWith('path/to/file.md');
            });

            it('if any object in the path does not have a markdown file associated with it', async () => {
                mockStorage.contentFileExists.mockImplementation((file) => {
                    return !file.endsWith('to.md');
                });

                const page = new Markdown('root', config, mockStorage, true);
                await expect(page.getPage('root/path/to/page.md')).rejects.toThrow(NotFoundError);

                expect(mockStorage.contentFileExists).toBeCalledTimes(3);
                expect(mockStorage.contentFileExists.mock.calls[0][0]).toBe('root/index.md');
                expect(mockStorage.contentFileExists.mock.calls[1][0]).toBe('root/path.md');
                expect(mockStorage.contentFileExists.mock.calls[2][0]).toBe('root/path/to.md');
            });
        });

        describe('returns a file', () => {
            const expectedPage = { content: contentFile };
            beforeEach(() => {
                mockStorage.contentFileExists.mockReturnValue(true);
            });

            it('returns the index.md content file for a root object where the targetPath matches the first object', async () => {
                const page = new Markdown('path/to/root', config, mockStorage, true);

                const actualPage = await page.getPage('path/to/root');

                expect(mockStorage.getContentFile).toBeCalledWith('path/to/root/index.md');
                expect(actualPage).toStrictEqual(expectedPage);
            });

            it('returns the requested content file for a non-root object where the targetPath matches the first object', async () => {
                const page = new Markdown('path/to/file.md', config, mockStorage);

                const actualPage = await page.getPage('path/to/file.md');

                expect(mockStorage.getContentFile).toBeCalledWith('path/to/file.md');
                expect(actualPage).toStrictEqual(expectedPage);
            });

            it('recurses through objects for a long path and returns the file from the last object', async () => {
                const page = new Markdown('root', config, mockStorage, true);

                const actualPage = await page.getPage('root/path/to/page.md');

                expect(mockStorage.contentFileExists).toBeCalledTimes(4);
                expect(mockStorage.contentFileExists.mock.calls[0][0]).toBe('root/index.md');
                expect(mockStorage.contentFileExists.mock.calls[1][0]).toBe('root/path.md');
                expect(mockStorage.contentFileExists.mock.calls[2][0]).toBe('root/path/to.md');
                expect(mockStorage.contentFileExists.mock.calls[3][0]).toBe('root/path/to/page.md');
                expect(mockStorage.getContentFile).toBeCalledWith('root/path/to/page.md');
                expect(actualPage).toStrictEqual(expectedPage);
            });
        });

        describe('restricts access', () => {
            beforeEach(() => {
                mockStorage.contentFileExists.mockReturnValue(true);
                const parsedYaml = { title: 'Some Title', restrict: 'role1' };
                mockSplitFrontMatter.mockReturnValue([parsedYaml]);
                mockYAMLparse.mockReturnValue(parsedYaml);
            });

            it('throws if access is restricted and no user is entered', async () => {
                const page = new Markdown('path/to/root', config, mockStorage, true);

                await expect(page.getPage('path/to/root')).rejects.toThrow(NotPermittedError);
            });

            it('throws if access is restricted and user does not have permission', async () => {
                const user = { id: 'some-user', roles: ['role2', 'role3'] };
                const page = new Markdown('path/to/root', config, mockStorage, true);

                await expect(page.getPage('path/to/root', user)).rejects.toThrow(NotPermittedError);
            });

            it('does not throw if access is restricted, user does not have permission, but authentication is disabled', async () => {
                const newConfig = { ...config, enableAuthentication: false };
                const user = { id: 'some-user', roles: ['role2', 'role3'] };
                const page = new Markdown('path/to/root', newConfig, mockStorage, true);

                await expect(page.getPage('path/to/root', user)).resolves.toBeDefined();
            });

            it('does not throw if access is restricted and user has permission', async () => {
                const user = { id: 'some-user', roles: ['role1', 'role2', 'role3'] };
                const page = new Markdown('path/to/root', config, mockStorage, true);

                await expect(page.getPage('path/to/root', user)).resolves.toBeDefined();
            });

            it('does not throw if access is restricted but user has admin rights', async () => {
                const user = { id: 'some-user', roles: ['admin'] };
                const page = new Markdown('path/to/root', config, mockStorage, true);

                await expect(page.getPage('path/to/root', user)).resolves.toBeDefined();
            });
        });
    });

    describe('writePage', () => {
        const writeContent = 'some-content';
        const writeContentBuf = Buffer.from('some-content');

        beforeEach(() => {
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            mockStorage.listContentChildren.mockResolvedValue([]);
            const parsedYaml = { title: 'Some Title', allowWrite: 'role1' };
            mockSplitFrontMatter.mockReturnValue([parsedYaml]);
            mockYAMLparse.mockReturnValue(parsedYaml);
        });

        describe('throws error', () => {
            const user = { id: 'some-user', roles: ['role1'] };

            it('for a root object if the object\'s root/index.md file does not exist', async () => {
                mockStorage.contentFileExists.mockReturnValue(false);
    
                const page = new Markdown('path/to/root', config, mockStorage, true);
                await expect(page.writePage('path/to/root', writeContent, user)).rejects.toThrow(NotFoundError);
    
                expect(mockStorage.contentFileExists).toBeCalledWith('path/to/root/index.md');
            });
    
            it('for a non-root object if the object\'s api path does not end in md', async () => {
                const page = new Markdown('path/to/file', config, mockStorage);
                await expect(page.writePage('path/to/file', writeContent, user)).rejects.toThrow(NotFoundError);
    
                expect(mockStorage.contentFileExists).not.toBeCalled();
            });
    
            it('for a non-root object if the object\'s content file does not exist', async () => {
                mockStorage.contentFileExists.mockReturnValue(false);
    
                const page = new Markdown('path/to/file.md', config, mockStorage);
                await expect(page.writePage('path/to/file.md', writeContent, user)).rejects.toThrow(NotFoundError);
    
                expect(mockStorage.contentFileExists).toBeCalledWith('path/to/file.md');
            });

            it('if any object in the path does not have a markdown file associated with it', async () => {
                mockStorage.contentFileExists.mockImplementation((file) => {
                    return !file.endsWith('to.md');
                });

                const page = new Markdown('root', config, mockStorage, true);
                await expect(page.writePage('root/path/to/page.md', writeContent, user)).rejects.toThrow(NotFoundError);

                expect(mockStorage.contentFileExists).toBeCalledTimes(3);
                expect(mockStorage.contentFileExists.mock.calls[0][0]).toBe('root/index.md');
                expect(mockStorage.contentFileExists.mock.calls[1][0]).toBe('root/path.md');
                expect(mockStorage.contentFileExists.mock.calls[2][0]).toBe('root/path/to.md');
            });
        });

        describe('writes the content file where the user is authorised', () => {
            const user = { id: 'some-user', roles: ['role1'] };

            beforeEach(() => {
                mockStorage.contentFileExists.mockReturnValue(true);
            });

            it('writes to the index.md content file for a root object where the targetPath matches the first object', async () => {
                const page = new Markdown('path/to/root', config, mockStorage, true);

                await page.writePage('path/to/root', writeContent, user);

                expect(mockStorage.storeContentFile).toBeCalledWith('path/to/root/index.md', writeContentBuf);
            });

            it('writes to the requested content file for a non-root object where the targetPath matches the first object', async () => {
                const page = new Markdown('path/to/file.md', config, mockStorage);

                await page.writePage('path/to/file.md', writeContent, user);

                expect(mockStorage.storeContentFile).toBeCalledWith('path/to/file.md', writeContentBuf);
            });

            it('recurses through objects for a long path and writes to the file from the last object', async () => {
                const page = new Markdown('root', config, mockStorage, true);

                await page.writePage('root/path/to/page.md', writeContent, user);

                expect(mockStorage.contentFileExists).toBeCalledTimes(4);
                expect(mockStorage.contentFileExists.mock.calls[0][0]).toBe('root/index.md');
                expect(mockStorage.contentFileExists.mock.calls[1][0]).toBe('root/path.md');
                expect(mockStorage.contentFileExists.mock.calls[2][0]).toBe('root/path/to.md');
                expect(mockStorage.contentFileExists.mock.calls[3][0]).toBe('root/path/to/page.md');
                expect(mockStorage.storeContentFile).toBeCalledWith('root/path/to/page.md', writeContentBuf);
            });
        });

        describe('restricts write access', () => {
            beforeEach(() => {
                mockStorage.contentFileExists.mockReturnValue(true);
                const parsedYaml = { title: 'Some Title', allowWrite: 'role1' };
                mockSplitFrontMatter.mockReturnValue([parsedYaml]);
                mockYAMLparse.mockReturnValue(parsedYaml);
            });

            it('throws if no user is entered', async () => {
                const page = new Markdown('path/to/root', config, mockStorage, true);

                await expect(page.writePage('path/to/root', writeContent)).rejects.toThrow(NotPermittedError);
            });

            it('throws if user is not admin and does not have explicit write permission', async () => {
                const user = { id: 'some-user', roles: ['role2', 'role3'] };
                const page = new Markdown('path/to/root', config, mockStorage, true);

                await expect(page.writePage('path/to/root', writeContent, user)).rejects.toThrow(NotPermittedError);
            });

            it('does not throw if user has no permission, but authentication is disabled', async () => {
                const newConfig = { ...config, enableAuthentication: false };
                const user = { id: 'some-user', roles: ['role2', 'role3'] };
                const page = new Markdown('path/to/root', newConfig, mockStorage, true);

                await expect(page.writePage('path/to/root', writeContent, user)).resolves.toBeUndefined();
            });

            it('does not throw if user has explicit write permission', async () => {
                const user = { id: 'some-user', roles: ['role1', 'role2', 'role3'] };
                const page = new Markdown('path/to/root', config, mockStorage, true);

                await expect(page.writePage('path/to/root', writeContent, user)).resolves.toBeUndefined();
            });

            it('does not throw if user has admin rights', async () => {
                const user = { id: 'some-user', roles: ['admin'] };
                const page = new Markdown('path/to/root', config, mockStorage, true);

                await expect(page.writePage('path/to/root', writeContent, user)).resolves.toBeUndefined();
            });
        });
    });

    describe('getTree', () => {
        beforeEach(() => {
            mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
        });

        describe('throws an error', () => {
            it('if the content file does not exist for a root object', async () => {
                mockStorage.contentFileExists.mockReturnValue(false);
    
                const page = new Markdown('root', config, mockStorage, true);
    
                await expect(() => page.getTree())
                    .rejects.toThrow(new NotFoundError('No markdown file found matching path root'));
                expect(mockStorage.contentFileExists).toBeCalledWith('root/index.md');
            });
    
            it('if the path does not end in md for a non-root object', async () => {
                const page = new Markdown('root', config, mockStorage);
    
                await expect(() => page.getTree())
                    .rejects.toThrow(new NotFoundError('No markdown file found matching path root'));
                expect(mockStorage.contentFileExists).not.toBeCalled();
            });
    
            it('if the content file does not exist for a non-root object', async () => {
                mockStorage.contentFileExists.mockReturnValue(false);
    
                const page = new Markdown('root/file.md', config, mockStorage);
    
                await expect(() => page.getTree())
                    .rejects.toThrow(new NotFoundError('No markdown file found matching path root/file.md'));
                expect(mockStorage.contentFileExists).toBeCalledWith('root/file.md');
            });
        });

        describe('returns data for a single file', () => {
            it('obtains metadata from the source file where none is cached', async () => {
                const parsedYaml = { title: 'Some Title' };
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                mockStorage.listContentChildren.mockResolvedValue([]);
                mockSplitFrontMatter.mockReturnValue([parsedYaml]);
                mockYAMLparse.mockReturnValue(parsedYaml);
    
                const page = new Markdown('root/file.md', config, mockStorage);
                const actualMetadata = await page.getTree();
    
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
                mockStorage.listContentChildren.mockResolvedValue([]);
                mockSplitFrontMatter.mockReturnValue([parsedYaml]);
                mockYAMLparse.mockReturnValue(parsedYaml);
    
                const page = new Markdown('root/file.md', config, mockStorage);
                const actualMetadata = await page.getTree();
    
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
                mockStorage.listContentChildren.mockResolvedValue([]);
                mockSplitFrontMatter.mockReturnValue([parsedYaml]);
                mockYAMLparse.mockReturnValue(parsedYaml);
    
                const page = new Markdown('root/file.md', config, mockStorage);
                const actualMetadata1 = await page.getTree();
                const actualMetadata2 = await page.getTree();
    
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
                mockStorage.listContentChildren.mockResolvedValue([]);
                mockSplitFrontMatter.mockReturnValue([parsedYaml]);
                mockYAMLparse.mockReturnValue(parsedYaml);
    
                const page = new Markdown('root/file.md', config, mockStorage);
                const actualMetadata1 = await page.getTree();
                const actualMetadata2 = await page.getTree();
    
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
                mockStorage.listContentChildren.mockResolvedValue([]);
                mockSplitFrontMatter.mockReturnValue([parsedYaml]);
                mockYAMLparse.mockReturnValue(parsedYaml);
    
                const page = new Markdown('root/file.md', config, mockStorage);
                const actualMetadata = await page.getTree();
    
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

        describe('returns data for a recursive markdown structure', () => {
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
    
                const page = new Markdown('rootDir', config, mockStorage, true);
    
                const expectedStructure = {
                    children: [
                        { title: 'rootDir', apiPath: 'rootDir', additionalData: {} } ,
                        { title: 'markdown1', apiPath: 'rootDir/markdown1.md', additionalData: {} },
                        { title: 'markdown2', apiPath: 'rootDir/markdown2.md', additionalData: {} }
                    ]
                };
                const structure = await page.getTree();
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
    
                const page = new Markdown('rootDir.md', config, mockStorage, false);
    
                const expectedStructure = {
                    title: 'rootDir', apiPath: 'rootDir.md', additionalData: {},
                    children: [
                        { title: 'markdown1', apiPath: 'rootDir/markdown1.md', additionalData: {} },
                        { title: 'markdown2', apiPath: 'rootDir/markdown2.md', additionalData: {} }
                    ]
                };
                const structure = await page.getTree();
                expect(structure).toStrictEqual(expectedStructure);
            });
    
            it('returns index file metadata as a single child for a root directory with no (other) children', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                mockStorage.listContentChildren.mockResolvedValue([]);
                mockSplitFrontMatter.mockReturnValue(['']);
                mockYAMLparse.mockReturnValue({});
    
                const page = new Markdown('rootDir', config, mockStorage, true);
    
                const expectedStructure = {
                    children: [{ title: 'rootDir', apiPath: 'rootDir', additionalData: {} } ]
                };
                const structure = await page.getTree();
                expect(structure).toStrictEqual(expectedStructure);
            });
    
            it('returns a single metadata item for a non-root page with no children', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                mockStorage.listContentChildren.mockResolvedValue([]);
                mockSplitFrontMatter.mockReturnValue(['']);
                mockYAMLparse.mockReturnValue({});
    
                const page = new Markdown('rootDir/page.md', config, mockStorage);
    
                const expectedStructure = { title: 'page', apiPath: 'rootDir/page.md', additionalData: {} };
                const structure = await page.getTree();
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
    
                const page = new Markdown('rootDir.md', config, mockStorage);
                const actualStructure = await page.getTree();
    
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
    
                const page = new Markdown('rootDir', config, mockStorage, true);
                const actualStructure = await page.getTree();
    
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
    
                const page = new Markdown('rootDir', config, mockStorage, true);
                const actualStructure = await page.getTree();
    
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

        describe('restricts access', () => {
            beforeEach(() => {
                const parsedYaml = {
                    restrict: 'role1'
                };
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                mockStorage.listContentChildren.mockResolvedValue([]);
                mockSplitFrontMatter.mockReturnValue([parsedYaml]);
                mockYAMLparse.mockReturnValue(parsedYaml);
            });

            it('returns undefined if access is restricted and no user is entered', async () => {
                const page = new Markdown('rootDir', config, mockStorage, true);

                await expect(page.getTree()).resolves.toBeUndefined();
            });

            it('returns undefined if access is restricted and no user does not have permission', async () => {
                const page = new Markdown('rootDir', config, mockStorage, true);
                const user = { id: 'some-user', roles: ['role2', 'role3'] };

                await expect(page.getTree(user)).resolves.toBeUndefined();
            });

            it('returns value if access is restricted and user has permission', async () => {
                const page = new Markdown('rootDir', config, mockStorage, true);
                const user = { id: 'some-user', roles: ['role1', 'role3'] };

                await expect(page.getTree(user)).resolves.toBeDefined();
            });

            it('returns value if access is restricted but user has admin rights', async () => {
                const page = new Markdown('rootDir', config, mockStorage, true);
                const user = { id: 'some-user', roles: ['admin'] };

                await expect(page.getTree(user)).resolves.toBeDefined();
            });
        });
    });
});
