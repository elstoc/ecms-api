/* eslint-disable  @typescript-eslint/no-explicit-any */
import { Markdown } from '../../../src/services/markdown/Markdown';
import YAML from 'yaml';
import { splitFrontMatter } from '../../../src/utils/markdown/splitFrontMatter';
import { NotFoundError, NotPermittedError } from '../../../src/errors';
import { IMarkdown } from '../../../src/services';
import path from 'path';

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
    deleteContentFile: jest.fn() as jest.Mock
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

        describe('when called for an extant file', () => {
            beforeEach(() => {
                mockStorage.contentFileExists.mockReturnValue(true);
            });

            describe('and there are no read restrictions', () => {
                it('returns the index.md content file for a root object where the targetPath matches the first object', async () => {
                    const page = new Markdown('path/to/root', config, mockStorage, true);

                    const actualPage = await page.getPage('path/to/root');

                    expect(mockStorage.getContentFile).toBeCalledWith('path/to/root/index.md');
                    expect(actualPage.content).toBe(contentFile);
                    expect(actualPage.pageExists).toBe(true);
                });

                it('returns the requested content file for a non-root object where the targetPath matches the first object', async () => {
                    const page = new Markdown('path/to/file', config, mockStorage);

                    const actualPage = await page.getPage('path/to/file');

                    expect(mockStorage.getContentFile).toBeCalledWith('path/to/file.md');
                    expect(actualPage.content).toBe(contentFile);
                    expect(actualPage.pageExists).toBe(true);
                });

                it('recurses through objects for a long path and returns the file from the last object', async () => {
                    const page = new Markdown('root', config, mockStorage, true);

                    const actualPage = await page.getPage('root/path/to/page');

                    expect(mockStorage.contentFileExists).toBeCalledTimes(4);
                    expect(mockStorage.contentFileExists.mock.calls[0][0]).toBe('root/index.md');
                    expect(mockStorage.contentFileExists.mock.calls[1][0]).toBe('root/path.md');
                    expect(mockStorage.contentFileExists.mock.calls[2][0]).toBe('root/path/to.md');
                    expect(mockStorage.contentFileExists.mock.calls[3][0]).toBe('root/path/to/page.md');
                    expect(mockStorage.getContentFile).toBeCalledWith('root/path/to/page.md');
                    expect(actualPage.content).toBe(contentFile);
                    expect(actualPage.pageExists).toBe(true);
                });
            });

            describe('and the path matches the current object, which has a read restriction', () => {
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

            describe('returns canWrite', () => {
                let page: IMarkdown;

                beforeEach(() => {
                    mockStorage.contentFileExists.mockReturnValue(true);
                    const parsedYaml = { title: 'Some Title', allowWrite: 'role1' };
                    mockSplitFrontMatter.mockReturnValue([parsedYaml]);
                    mockYAMLparse.mockReturnValue(parsedYaml);

                    page = new Markdown('path/to/root', config, mockStorage, true);
                });

                it('false if no user is entered', async () => {
                    const actualPage = await page.getPage('path/to/root');

                    expect(actualPage.canWrite).toBe(false);
                });

                it('false if user is not admin and does not have explicit write permission', async () => {
                    const user = { id: 'some-user', roles: ['role2', 'role3'] };

                    const actualPage = await page.getPage('path/to/root', user);

                    expect(actualPage.canWrite).toBe(false);
                });

                it('true if user has no permission, but authentication is disabled', async () => {
                    const newConfig = { ...config, enableAuthentication: false };
                    const user = { id: 'some-user', roles: ['role2', 'role3'] };
                    page = new Markdown('path/to/root', newConfig, mockStorage, true);

                    const actualPage = await page.getPage('path/to/root', user);

                    expect(actualPage.canWrite).toBe(true);
                });

                it('true if user has explicit write permission', async () => {
                    const user = { id: 'some-user', roles: ['role1', 'role2', 'role3'] };

                    const actualPage = await page.getPage('path/to/root', user);

                    expect(actualPage.canWrite).toBe(true);
                });

                it('true if user has admin rights', async () => {
                    const user = { id: 'some-user', roles: ['admin'] };

                    const actualPage = await page.getPage('path/to/root', user);

                    expect(actualPage.canWrite).toBe(true);
                });
            });

            describe('returns canDelete', () => {
                let page: IMarkdown;

                beforeEach(() => {
                    mockStorage.contentFileExists.mockReturnValue(true);
                    const parsedYaml = { title: 'Some Title', allowWrite: 'role1' };
                    mockSplitFrontMatter.mockReturnValue([parsedYaml]);
                    mockYAMLparse.mockReturnValue(parsedYaml);

                    page = new Markdown('path/to/root', config, mockStorage, true);
                });

                it('false if the user is admin and the page has children', async () => {
                    mockStorage.listContentChildren.mockResolvedValue(['file1.md', 'file2.md']);
                    const user = { id: 'some-user', roles: ['admin'] };

                    const actualPage = await page.getPage('path/to/root', user);

                    expect(actualPage.canDelete).toBe(false);
                });

                it('false if the user is not admin and the page has no children', async () => {
                    mockStorage.listContentChildren.mockResolvedValue([]);
                    const user = { id: 'some-user', roles: ['role1'] };

                    const actualPage = await page.getPage('path/to/root', user);

                    expect(actualPage.canDelete).toBe(false);
                });

                it('true if the user is admin and the page has no children', async () => {
                    mockStorage.listContentChildren.mockResolvedValue([]);
                    const user = { id: 'some-user', roles: ['admin'] };

                    const actualPage = await page.getPage('path/to/root', user);

                    expect(actualPage.canDelete).toBe(true);
                });
            });
        });

        describe('when called for a non-extant file', () => {
            describe('when the user is not admin', () => {
                it('throws for a root object if that object\'s root/index.md file does not exist', async () => {
                    mockStorage.contentFileExists.mockReturnValue(false);
        
                    const page = new Markdown('path/to/root', config, mockStorage, true);
                    await expect(page.getPage('path/to/root')).rejects.toThrow(NotFoundError);
        
                    expect(mockStorage.contentFileExists).toBeCalledWith('path/to/root/index.md');
                });
        
                it('throws for a non-root object if that object\'s content file does not exist', async () => {
                    mockStorage.contentFileExists.mockReturnValue(false);
        
                    const page = new Markdown('path/to/file', config, mockStorage);
                    await expect(page.getPage('path/to/file')).rejects.toThrow(NotFoundError);
        
                    expect(mockStorage.contentFileExists).toBeCalledWith('path/to/file.md');
                });

                it('throws if any object deeper in the path does not have a markdown file associated with it', async () => {
                    mockStorage.contentFileExists.mockImplementation((file) => {
                        return !file.endsWith('to.md');
                    });

                    const page = new Markdown('root', config, mockStorage, true);
                    await expect(page.getPage('root/path/to/page')).rejects.toThrow(NotFoundError);

                    expect(mockStorage.contentFileExists).toBeCalledTimes(3);
                    expect(mockStorage.contentFileExists.mock.calls[0][0]).toBe('root/index.md');
                    expect(mockStorage.contentFileExists.mock.calls[1][0]).toBe('root/path.md');
                    expect(mockStorage.contentFileExists.mock.calls[2][0]).toBe('root/path/to.md');
                });
            });
            
            describe('when the user is admin', () => {
                let rootPage: IMarkdown;
                const nonExistentPage = 'rootPath/existingPage/nonExistentPage';

                beforeEach(() => {
                    rootPage = new Markdown('rootPath', config, mockStorage, true);
                    mockStorage.contentFileExists.mockImplementation((path: string) => {
                        return !path.includes('nonExistentPage');
                    });
                });

                it.each([
                    'hasinvalid$char/file',
                    'hasinvalid.char/file',
                    'hasinvalid,char/file',
                    'valid-part/hasinvalid%char'
                ])('and the target path is invalid, the returned object reflects this, and contains empty markdown (%s)', async (path: string) => {
                    const expectedPage = {
                        content: '',
                        pageExists: false,
                        pathValid: false,
                        canWrite: false,
                        canDelete: false
                    };
                    const user = { id: 'some-user', roles: ['admin'] };

                    const actualPage = await rootPage.getPage(`${nonExistentPage}/${path}`, user);
                    expect(actualPage).toStrictEqual(expectedPage);
                });

                it.each([
                    'abcdef/ghijklmno/pqrstuvwxyz',
                    'ABCDEF/GHIJKLMNO/PQRSTUVWXYZ',
                    '01-234/5/67_890',
                ])('and the target path is valid, the returned object reflects this, and contains a markdown template (%s)', async (inPath: string) => {
                    const expectedPage = {
                        content: `---\ntitle: ${path.basename(inPath)}\n---\n\n`,
                        pageExists: false,
                        pathValid: true,
                        canWrite: true,
                        canDelete: false
                    };
                    const user = { id: 'some-user', roles: ['admin'] };

                    const actualPage = await rootPage.getPage(`${nonExistentPage}/${inPath}`, user);
                    expect(actualPage).toStrictEqual(expectedPage);
                });
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

        describe('when called for an extant file', () => {
            describe('restricts access', () => {
                let page: IMarkdown;

                beforeEach(() => {
                    mockStorage.contentFileExists.mockReturnValue(true);
                    const parsedYaml = { title: 'Some Title', allowWrite: 'role1' };
                    mockSplitFrontMatter.mockReturnValue([parsedYaml]);
                    mockYAMLparse.mockReturnValue(parsedYaml);

                    page = new Markdown('path/to/root', config, mockStorage, true);
                });

                it('throws if no user is entered', async () => {
                    await expect(page.writePage('path/to/root', writeContent)).rejects.toThrow(NotPermittedError);
                });

                it('throws if user is not admin and does not have explicit write permission', async () => {
                    const user = { id: 'some-user', roles: ['role2', 'role3'] };

                    await expect(page.writePage('path/to/root', writeContent, user)).rejects.toThrow(NotPermittedError);
                });

                it('does not throw if user has no permission, but authentication is disabled', async () => {
                    const newConfig = { ...config, enableAuthentication: false };
                    const user = { id: 'some-user', roles: ['role2', 'role3'] };
                    page = new Markdown('path/to/root', newConfig, mockStorage, true);

                    await expect(page.writePage('path/to/root', writeContent, user)).resolves.toBeUndefined();
                });

                it('does not throw if user has explicit write permission', async () => {
                    const user = { id: 'some-user', roles: ['role1', 'role2', 'role3'] };

                    await expect(page.writePage('path/to/root', writeContent, user)).resolves.toBeUndefined();
                });

                it('does not throw if user has admin rights', async () => {
                    const user = { id: 'some-user', roles: ['admin'] };

                    await expect(page.writePage('path/to/root', writeContent, user)).resolves.toBeUndefined();
                });

                it('throws if user does not have read access to one of the files in the path', async () => {
                    const user = { id: 'some-user', roles: ['role1'] };
                    mockStorage.getContentFile.mockImplementation((path) => path);
                    mockSplitFrontMatter.mockImplementation((path) => [path]);
                    mockYAMLparse.mockImplementation((path) => (
                        path === 'path/to/root/some/long/path.md'
                            ? { restrict: 'roleX', allowWrite: 'role1' }
                            : { restrict: 'role1', allowWrite: 'role1' }
                    ));

                    page = new Markdown('path/to/root', config, mockStorage, true);

                    await expect(page.writePage('path/to/root/some/long/path/to/markdown', writeContent, user))
                        .rejects.toThrow(NotPermittedError);
                    expect(mockStorage.getContentFile).toBeCalledTimes(4);
                });

                it('throws if user does not have write access to the last file in the path (and only read access to the rest)', async () => {
                    const user = { id: 'some-user', roles: ['role2'] };

                    page = new Markdown('path/to/root', config, mockStorage, true);

                    await expect(page.writePage('path/to/root/some/long/path/to/markdown', writeContent, user))
                        .rejects.toThrow(NotPermittedError);
                    expect(mockStorage.getContentFile).toBeCalledTimes(6);
                });

                it('does not throw if user only has write access to the last file in the path (and only read access to the rest)', async () => {
                    const user = { id: 'some-user', roles: ['role1'] };
                    mockStorage.getContentFile.mockImplementation((path) => path);
                    mockSplitFrontMatter.mockImplementation((path) => [path]);
                    mockYAMLparse.mockImplementation((path) => (
                        path === 'path/to/root/some/long/path/to/markdown.md'
                            ? { restrict: 'role1', allowWrite: 'role1' }
                            : { restrict: 'role1' }
                    ));

                    page = new Markdown('path/to/root', config, mockStorage, true);

                    await expect(page.writePage('path/to/root/some/long/path/to/markdown', writeContent, user))
                        .resolves.toBeUndefined();
                    expect(mockStorage.getContentFile).toBeCalledTimes(6);
                });
            });

            describe('updates the file correctly for a user with write access', () => {
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
                    const page = new Markdown('path/to/file', config, mockStorage);

                    await page.writePage('path/to/file', writeContent, user);

                    expect(mockStorage.storeContentFile).toBeCalledWith('path/to/file.md', writeContentBuf);
                });

                it('recurses through objects for a long path and writes to the file from the last object', async () => {
                    const page = new Markdown('root', config, mockStorage, true);

                    await page.writePage('root/path/to/page', writeContent, user);

                    expect(mockStorage.contentFileExists).toBeCalledTimes(4);
                    expect(mockStorage.contentFileExists.mock.calls[0][0]).toBe('root/index.md');
                    expect(mockStorage.contentFileExists.mock.calls[1][0]).toBe('root/path.md');
                    expect(mockStorage.contentFileExists.mock.calls[2][0]).toBe('root/path/to.md');
                    expect(mockStorage.contentFileExists.mock.calls[3][0]).toBe('root/path/to/page.md');
                    expect(mockStorage.storeContentFile).toBeCalledWith('root/path/to/page.md', writeContentBuf);
                });
            });
        });

        describe('when called for a non-extant file', () => {
            describe('and the user is not admin', () => {
                const user = { id: 'some-user', roles: ['role1'] };

                it('for a root object if the object\'s root/index.md file does not exist', async () => {
                    mockStorage.contentFileExists.mockReturnValue(false);
        
                    const page = new Markdown('path/to/root', config, mockStorage, true);
                    await expect(page.writePage('path/to/root', writeContent, user)).rejects.toThrow(NotFoundError);
        
                    expect(mockStorage.contentFileExists).toBeCalledWith('path/to/root/index.md');
                });
        
                it('for a non-root object if the object\'s content file does not exist', async () => {
                    mockStorage.contentFileExists.mockReturnValue(false);
        
                    const page = new Markdown('path/to/file', config, mockStorage);
                    await expect(page.writePage('path/to/file', writeContent, user)).rejects.toThrow(NotFoundError);
        
                    expect(mockStorage.contentFileExists).toBeCalledWith('path/to/file.md');
                });

                it('if any object in the path does not have a markdown file associated with it', async () => {
                    mockStorage.contentFileExists.mockImplementation((file) => {
                        return !file.endsWith('to.md');
                    });

                    const page = new Markdown('root', config, mockStorage, true);
                    await expect(page.writePage('root/path/to/page', writeContent, user)).rejects.toThrow(NotFoundError);

                    expect(mockStorage.contentFileExists).toBeCalledTimes(3);
                    expect(mockStorage.contentFileExists.mock.calls[0][0]).toBe('root/index.md');
                    expect(mockStorage.contentFileExists.mock.calls[1][0]).toBe('root/path.md');
                    expect(mockStorage.contentFileExists.mock.calls[2][0]).toBe('root/path/to.md');
                });
            });

            describe('and the user is admin', () => {
                let rootPage: IMarkdown;
                const nonExistentPage = 'rootPath/existingPage/nonExistentPage';
                const user = { id: 'some-user', roles: ['admin'] };

                beforeEach(() => {
                    rootPage = new Markdown('rootPath', config, mockStorage, true);
                    // the first two parts of the path already exist
                    // then the subsequent parts of the path don't exist, are created, then exist (if the path is valid)
                    mockStorage.contentFileExists
                        .mockReturnValueOnce(true)
                        .mockReturnValueOnce(true)
                        .mockReturnValueOnce(false)
                        .mockReturnValueOnce(true)
                        .mockReturnValueOnce(false)
                        .mockReturnValueOnce(true)
                        .mockReturnValueOnce(false)
                        .mockReturnValueOnce(true)
                        .mockReturnValueOnce(false)
                        .mockReturnValueOnce(true)
                        .mockReturnValueOnce(false)
                        .mockReturnValueOnce(true);
                });

                it.each([
                    'abcdef/ghijklmno/pqrstuvwxyz',
                    'ABCDEF/GHIJKLMNO/PQRSTUVWXYZ',
                    '01-234/5/67_890',
                ])('creates all intermediate files as well if the entire path is valid (%s)', async (path: string) => {
                    await expect(rootPage.writePage(`${nonExistentPage}/${path}`, writeContent, user))
                        .resolves.toBeUndefined();
                    // each non-existent content file is created (empty)
                    // the final file in the path is then written with the appropriate content
                    expect(mockStorage.storeContentFile).toHaveBeenNthCalledWith(1, expect.anything(), Buffer.from(''));
                    expect(mockStorage.storeContentFile).toHaveBeenNthCalledWith(2, expect.anything(), Buffer.from(''));
                    expect(mockStorage.storeContentFile).toHaveBeenNthCalledWith(3, expect.anything(), Buffer.from(''));
                    expect(mockStorage.storeContentFile).toHaveBeenNthCalledWith(4, expect.anything(), Buffer.from(''));
                    expect(mockStorage.storeContentFile).toHaveBeenNthCalledWith(5, expect.anything(), Buffer.from(writeContent));
                });

                it.each([
                    'hasinvalid$char/file',
                    'hasinvalid.char/file',
                    'hasinvalid,char/file',
                    'valid-part/hasinvalid%char'
                ])('throws if any part of the remaining path is invalid (%s)', async (path: string) => {
                    await expect(rootPage.writePage(`${nonExistentPage}/${path}`, writeContent, user))
                        .rejects.toThrow(NotFoundError);
                });
            });
        });
    });

    describe('deletePage', () => {
        it('throws an error if the user does not have admin access', async () => {
            const user = { id: 'some-user', roles: ['role1'] };
            const page = new Markdown('path/to/root', config, mockStorage, true);

            await expect(page.deletePage('path/to/root/page.md', user)).rejects.toThrow(NotPermittedError);
        });

        it('throws an error if the content file does not exist', async () => {
            const user = { id: 'some-user', roles: ['admin'] };
            mockStorage.contentFileExists.mockReturnValue(false);
            const page = new Markdown('path/to/root', config, mockStorage, true);

            await expect(page.deletePage('path/to/root/page', user)).rejects.toThrow(NotFoundError);
        });

        it('throws an error if the file to be deleted has children', async () => {
            const user = { id: 'some-user', roles: ['admin'] };
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.listContentChildren.mockResolvedValue(['page.md', 'index.md']);
            const page = new Markdown('path/to/root', config, mockStorage, true);

            await expect(page.deletePage('path/to/root/page', user)).rejects.toThrow(new NotPermittedError('cannot delete markdown files which have children'));
        });

        it('deletes the content file for the current object instance if there are no children and the api paths match', async() => {
            const user = { id: 'some-user', roles: ['admin'] };
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.listContentChildren.mockResolvedValue([]);
            const page = new Markdown('path/to/root', config, mockStorage, true);

            await expect(page.deletePage('path/to/root/page', user)).resolves.toBeUndefined();

            expect(mockStorage.deleteContentFile).toBeCalledWith('path/to/root/page.md');
        });

        it('recurses through objects if the file to be deleted is deeper in the tree', async () => {
            const user = { id: 'some-user', roles: ['admin'] };
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.listContentChildren.mockResolvedValue([]);
            const page = new Markdown('path/to/root', config, mockStorage, true);

            await expect(page.deletePage('path/to/root/path/to/page', user)).resolves.toBeUndefined();

            expect(mockStorage.contentFileExists).toBeCalledTimes(4);
            expect(mockStorage.deleteContentFile).toBeCalledWith('path/to/root/path/to/page.md');
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
    
            it('if the content file does not exist for a non-root object', async () => {
                mockStorage.contentFileExists.mockReturnValue(false);
    
                const page = new Markdown('root/file', config, mockStorage);
    
                await expect(() => page.getTree())
                    .rejects.toThrow(new NotFoundError('No markdown file found matching path root/file'));
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
    
                const page = new Markdown('root/file', config, mockStorage);
                const actualMetadata = await page.getTree();
    
                const expectedMetadata = {
                    apiPath: 'root/file',
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
    
                const page = new Markdown('root/file', config, mockStorage);
                const actualMetadata = await page.getTree();
    
                const expectedMetadata = {
                    apiPath: 'root/file',
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
    
                const page = new Markdown('root/file', config, mockStorage);
                const actualMetadata1 = await page.getTree();
                const actualMetadata2 = await page.getTree();
    
                const expectedMetadata = {
                    apiPath: 'root/file',
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
    
                const page = new Markdown('root/file', config, mockStorage);
                const actualMetadata1 = await page.getTree();
                const actualMetadata2 = await page.getTree();
    
                const expectedMetadata = {
                    apiPath: 'root/file',
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
    
                const page = new Markdown('root/file', config, mockStorage);
                const actualMetadata = await page.getTree();
    
                const expectedMetadata = {
                    apiPath: 'root/file',
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
                        { title: 'markdown1', apiPath: 'rootDir/markdown1', additionalData: {} },
                        { title: 'markdown2', apiPath: 'rootDir/markdown2', additionalData: {} }
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
    
                const page = new Markdown('rootDir', config, mockStorage, false);
    
                const expectedStructure = {
                    title: 'rootDir', apiPath: 'rootDir', additionalData: {},
                    children: [
                        { title: 'markdown1', apiPath: 'rootDir/markdown1', additionalData: {} },
                        { title: 'markdown2', apiPath: 'rootDir/markdown2', additionalData: {} }
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
    
                const page = new Markdown('rootDir/page', config, mockStorage);
    
                const expectedStructure = { title: 'page', apiPath: 'rootDir/page', additionalData: {} };
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
    
                const page = new Markdown('rootDir', config, mockStorage);
                const actualStructure = await page.getTree();
    
                const expectedStructure = {
                    title: 'rootDir', apiPath: 'rootDir', additionalData: {},
                    children: [
                        { title: 'fileC', apiPath: 'rootDir/fileC', weight: 10, additionalData: {} },
                        { title: 'fileB', apiPath: 'rootDir/fileB', weight: 20, additionalData: {} },
                        { title: 'fileA', apiPath: 'rootDir/fileA', weight: 30, additionalData: {} },
                        { title: 'fileD', apiPath: 'rootDir/fileD', additionalData: {} },
                        { title: 'fileE', apiPath: 'rootDir/fileE', additionalData: {} },
                        { title: 'fileF', apiPath: 'rootDir/fileF', additionalData: {} },
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
                        { title: 'fileC', apiPath: 'rootDir/fileC', weight: 10, additionalData: {} },
                        { title: 'fileB', apiPath: 'rootDir/fileB', weight: 20, additionalData: {} },
                        { title: 'fileA', apiPath: 'rootDir/fileA', weight: 30, additionalData: {} },
                        { title: 'fileD', apiPath: 'rootDir/fileD', additionalData: {} },
                        { title: 'fileE', apiPath: 'rootDir/fileE', additionalData: {} },
                        { title: 'fileF', apiPath: 'rootDir/fileF', additionalData: {} },
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
                        { title: 'file1', apiPath: 'rootDir/file1', additionalData: {} },
                        { title: 'file2', apiPath: 'rootDir/file2', additionalData: {} },
                        {
                            title: 'firstDir', apiPath: 'rootDir/firstDir', additionalData: {},
                            children: [
                                { title: 'file3', apiPath: 'rootDir/firstDir/file3', additionalData: {} },
                                { title: 'file4', apiPath: 'rootDir/firstDir/file4', additionalData: {} },
                                {
                                    title: 'firstSubDir', apiPath: 'rootDir/firstDir/firstSubDir', additionalData: {},
                                    children: [
                                        { title: 'file5', apiPath: 'rootDir/firstDir/firstSubDir/file5', additionalData: {} },
                                        { title: 'file6', apiPath: 'rootDir/firstDir/firstSubDir/file6', additionalData: {} },
                                        {
                                            title: 'secondSubDir', apiPath: 'rootDir/firstDir/firstSubDir/secondSubDir', additionalData: {},
                                            children: [
                                                { title: 'file7', apiPath: 'rootDir/firstDir/firstSubDir/secondSubDir/file7', additionalData: {} },
                                                { title: 'file8', apiPath: 'rootDir/firstDir/firstSubDir/secondSubDir/file8', additionalData: {} },
                                                { title: 'file9', apiPath: 'rootDir/firstDir/firstSubDir/secondSubDir/file9', additionalData: {} },
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
