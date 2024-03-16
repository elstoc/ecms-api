/* eslint-disable  @typescript-eslint/no-explicit-any */
import { NotPermittedError } from '../../../src/errors';
import { Site, SiteComponent, User } from '../../../src/services';

jest.mock('../../../src/services/site/SiteComponent');

const config = {
    dataDir: '/path/to/data',
    enableAuthentication: true
} as any;

const mockStorage = {
    listContentChildren: jest.fn() as jest.Mock,
    contentFileExists: jest.fn() as jest.Mock,
    getContentFullPath: jest.fn() as jest.Mock,
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
const mockSiteComponent = SiteComponent as jest.Mock;

describe('Site', () => {
    describe('listComponents', () => {
        let site: Site;
        
        it('only attempts to process yaml files in the content directory (ignores other files/extensions/directories)', async () => {
            mockSiteComponent.mockImplementation((_, inputFilePath) => ({
                getMetadata: () => ({ uiPath: inputFilePath })
            }));
            mockStorage.listContentChildren.mockImplementation(async (_, fileMatcher) => {
                return [
                    'component01.yaml',
                    'component02.yaml',
                    'component03.yaml',
                    'notcomponent.txt',
                    'notcomponent.jpg'
                ].filter(fileMatcher);
            });

            site = new Site(config, mockStorage);
            const actualComponentList = await site.listComponents();

            const expectedComponentList = [
                { uiPath: 'component01' },
                { uiPath: 'component02' },
                { uiPath: 'component03' },
            ];
            expect(mockSiteComponent).toHaveBeenCalledTimes(3);
            expect(mockSiteComponent).toHaveBeenCalledWith(config, 'component01', mockStorage);
            expect(mockSiteComponent).toHaveBeenCalledWith(config, 'component02', mockStorage);
            expect(mockSiteComponent).toHaveBeenCalledWith(config, 'component03', mockStorage);

            expect(actualComponentList).toStrictEqual(expectedComponentList);
        });

        it('only creates new SiteComponent instances for yaml files it has not seen before', async () => {
            mockSiteComponent.mockImplementation((_, inputFilePath) => ({
                getMetadata: () => ({ uiPath: inputFilePath })
            }));
            mockStorage.listContentChildren.mockResolvedValueOnce([
                'component01.yaml',
                'component02.yaml',
                'component03.yaml',
            ]).mockResolvedValue([
                'component01.yaml',
                'component02.yaml',
                'component03.yaml',
                'component04.yaml',
            ]);

            site = new Site(config, mockStorage);
            const actualComponentList1 = await site.listComponents();
            const actualComponentList2 = await site.listComponents();

            const expectedComponentList1 = [
                { uiPath: 'component01' },
                { uiPath: 'component02' },
                { uiPath: 'component03' },
            ];
            const expectedComponentList2 = [...expectedComponentList1, { uiPath: 'component04' }];
            expect(mockSiteComponent).toHaveBeenCalledTimes(4);
            expect(mockSiteComponent).toHaveBeenCalledWith(config, 'component01', mockStorage);
            expect(mockSiteComponent).toHaveBeenCalledWith(config, 'component02', mockStorage);
            expect(mockSiteComponent).toHaveBeenCalledWith(config, 'component03', mockStorage);
            expect(mockSiteComponent).toHaveBeenCalledWith(config, 'component04', mockStorage);

            expect(actualComponentList1).toStrictEqual(expectedComponentList1);
            expect(actualComponentList2).toStrictEqual(expectedComponentList2);
        });

        it('no longer sends metadata for files that have been deleted', async () => {
            mockSiteComponent.mockImplementation((_, inputFilePath) => ({
                getMetadata: () => ({ uiPath: inputFilePath })
            }));
            mockStorage.listContentChildren.mockResolvedValueOnce([
                'component01.yaml',
                'component02.yaml',
                'component03.yaml',
                'component04.yaml',
            ]).mockResolvedValue([
                'component01.yaml',
                'component02.yaml',
                'component03.yaml',
            ]);

            site = new Site(config, mockStorage);
            const actualComponentList1 = await site.listComponents();
            const actualComponentList2 = await site.listComponents();

            const expectedComponentList2 = [
                { uiPath: 'component01' },
                { uiPath: 'component02' },
                { uiPath: 'component03' },
            ];
            const expectedComponentList1 = [...expectedComponentList2, { uiPath: 'component04' }];

            expect(actualComponentList1).toStrictEqual(expectedComponentList1);
            expect(actualComponentList2).toStrictEqual(expectedComponentList2);
        });

        it('sorts weighted components first, ascending numerically by weight, then unweighted components ascending alphabetically by title', async () => {
            (SiteComponent as jest.Mock).mockImplementation((_, inputFilePath) => ({
                getMetadata: () => {
                    const returnData = { uiPath: inputFilePath, title: inputFilePath } as any;
                    if (inputFilePath.endsWith('componentE')) returnData.weight = 10;
                    if (inputFilePath.endsWith('componentG')) returnData.weight = 20;
                    if (inputFilePath.endsWith('componentB')) returnData.weight = 30;
                    return returnData;
                }
            }));
            mockStorage.listContentChildren.mockResolvedValue([
                'componentA.yaml',
                'componentB.yaml',
                'componentC.yaml',
                'componentD.yaml',
                'componentE.yaml',
                'componentF.yaml',
                'componentG.yaml',
            ]);

            site = new Site(config, mockStorage);
            const actualNavData = await site.listComponents();

            const expectedNavData = [
                { uiPath: 'componentE', title: 'componentE', weight: 10 },
                { uiPath: 'componentG', title: 'componentG', weight: 20 },
                { uiPath: 'componentB', title: 'componentB', weight: 30 },
                { uiPath: 'componentA', title: 'componentA' },
                { uiPath: 'componentC', title: 'componentC' },
                { uiPath: 'componentD', title: 'componentD' },
                { uiPath: 'componentF', title: 'componentF' },
            ];
            expect(actualNavData).toStrictEqual(expectedNavData);
        });

        it('filters out any undefined metadata returned by the component (due to no permission)', async () => {
            mockSiteComponent.mockImplementation((_, inputFilePath) => ({
                getMetadata: () => (inputFilePath.endsWith('01') ? undefined : { uiPath: inputFilePath })
            }));
            mockStorage.listContentChildren.mockImplementation(async (_, fileMatcher) => {
                return [
                    'component01.yaml',
                    'component02.yaml',
                    'component03.yaml',
                    'notcomponent.txt',
                    'notcomponent.jpg'
                ].filter(fileMatcher);
            });

            site = new Site(config, mockStorage);
            const actualComponentList = await site.listComponents();

            const expectedComponentList = [
                { uiPath: 'component02' },
                { uiPath: 'component03' },
            ];
            expect(actualComponentList).toStrictEqual(expectedComponentList);
        });

    });

    describe('getGallery', () => {
        it('gets the appropriate gallery object', async () => {
            const site = new Site(config, mockStorage);
            mockSiteComponent.mockImplementation((_, inputFilePath) => ({
                getGallery: () => inputFilePath
            }));
            const gallery = await site.getGallery('galleryComponent');

            expect(gallery).toBe('galleryComponent');
        });
    });

    describe('getMarkdown', () => {
        it('gets the appropriate markdown object', async () => {
            const site = new Site(config, mockStorage);
            mockSiteComponent.mockImplementation((_, inputFilePath) => ({
                getMarkdown: () => inputFilePath
            }));
            const markdown = await site.getMarkdown('markdownComponent');

            expect(markdown).toBe('markdownComponent');
        });
    });

    describe('getMediaDb', () => {
        it('gets the appropriate mediadb object', async () => {
            const site = new Site(config, mockStorage);
            mockSiteComponent.mockImplementation((_, inputFilePath) => ({
                getMediaDb: () => inputFilePath
            }));
            const mediadb = await site.getMediaDb('mediaDbComponent');

            expect(mediadb).toBe('mediaDbComponent');
        });
    });

    describe('getGalleryContents', () => {
        it('runs getContents on the appropriate gallery object', async () => {
            mockSiteComponent.mockImplementation((_, inputFilePath) => ({
                getGallery: () => ({ getContents: (limit: number) => `${inputFilePath}-${limit}-metadata` })
            }));

            const site = new Site(config, mockStorage);
            const actualGallerydata = await site.getGalleryContents('component01', 30);

            const expectedGallerydata = 'component01-30-metadata';
            expect(actualGallerydata).toBe(expectedGallerydata);
        });
    });

    describe('getGalleryImageFile', () => {
        it('calls getImageFile on the appropriate gallery object', async () => {
            const getImageFile = jest.fn();
            mockSiteComponent.mockImplementation(() => ({
                getGallery: () => ({ getImageFile })
            }));

            const site = new Site(config, mockStorage);
            await site.getGalleryImageFile('component01/image1.jpg', 'thumb', '1234');

            expect(getImageFile).toHaveBeenCalledWith('component01/image1.jpg', 'thumb', '1234');
        });
    });

    describe('getMarkdownTree', () => {
        it('runs getTree on the appropriate markdown object', async () => {
            mockSiteComponent.mockImplementation((_, inputFilePath) => ({
                getMarkdown: () => ({ getTree: (user: User) => `${inputFilePath}-${user.id}` })
            }));
            const user = { id: 'some-user' };

            const site = new Site(config, mockStorage);
            const actualMarkdownTree = await site.getMarkdownTree('component02', user);

            const expectedMarkdownTree = 'component02-some-user';
            expect(actualMarkdownTree).toBe(expectedMarkdownTree);
        });

        it('throws NotPermittedError if returned structure is undefined', async () => {
            mockSiteComponent.mockImplementation(() => ({
                getMarkdown: () => ({ getTree: () => undefined })
            }));

            const site = new Site(config, mockStorage);
            await expect(site.getMarkdownTree('component02')).rejects.toThrow(NotPermittedError);
        });
    });

    describe('getMarkdownPage', () => {
        it('runs getPage on the appropriate markdown object', async () => {
            const getPage = jest.fn();
            mockSiteComponent.mockImplementation(() => ({
                getMarkdown: () => ({ getPage })
            }));
            const user = { id: 'some-user' };

            const site = new Site(config, mockStorage);
            await site.getMarkdownPage('component02/path/to/file', user);

            expect(getPage).toHaveBeenCalledWith('component02/path/to/file', user);
        });
    });

    describe('writeMarkdownPage', () => {
        it('runs writePage on the appropriate markdown object', async () => {
            const writePage = jest.fn();
            mockSiteComponent.mockImplementation(() => ({
                getMarkdown: () => ({ writePage })
            }));
            const user = { id: 'some-user' };

            const site = new Site(config, mockStorage);
            await site.writeMarkdownPage('component02/path/to/file', 'some-content', user);

            expect(writePage).toHaveBeenCalledWith('component02/path/to/file', 'some-content', user);
        });
    });

    describe('deleteMarkdownPage', () => {
        it('runs deletePage on the appropriate markdown object', async () => {
            const deletePage = jest.fn();
            mockSiteComponent.mockImplementation(() => ({
                getMarkdown: () => ({ deletePage })
            }));
            const user = { id: 'some-user' };

            const site = new Site(config, mockStorage);
            await site.deleteMarkdownPage('component02/path/to/file', user);

            expect(deletePage).toHaveBeenCalledWith('component02/path/to/file', user);
        });
    });

    describe('getMediaDbVersion', () => {
        it('runs getVersion on the appropriate mediadb object', async () => {
            const getVersion = jest.fn();
            mockSiteComponent.mockImplementation(() => ({
                getMediaDb: () => ({ getVersion })
            }));

            const site = new Site(config, mockStorage);
            await site.getMediaDbVersion('component02/path/to/file');
            
            expect(getVersion).toHaveBeenCalledTimes(1);
        });
    });

    describe('shutdown', () => {
        it('runs shutdown on every created site component', async () => {
            const mockShutdown = jest.fn();
            mockSiteComponent.mockImplementation((_, inputFilePath) => ({
                getMetadata: () => ({ uiPath: inputFilePath }),
                shutdown: mockShutdown
            }));
            mockStorage.listContentChildren.mockImplementation(async (_, fileMatcher) => {
                return [
                    'component01.yaml',
                    'component02.yaml',
                    'component03.yaml',
                ].filter(fileMatcher);
            });

            const site = new Site(config, mockStorage);
            await site.listComponents(); // required to create the components to be shut down

            await site.shutdown();

            expect(mockShutdown).toHaveBeenCalledTimes(3);
        });
    });

    describe('getConfig', () => {
        it('returns true & footer text if enableAuthentication is true', () => {
            const newConfig = { ...config, enableAuthentication: true, footerText: 'some-footer-text' };

            const site = new Site(newConfig, mockStorage);

            expect(site.getConfig()).toStrictEqual({ authEnabled: true, footerText: 'some-footer-text' });
        });

        it('returns false & footer text if enableAuthentication is false', () => {
            const newConfig = { ...config, enableAuthentication: false, footerText: 'some-other-footer-text' };

            const site = new Site(newConfig, mockStorage);

            expect(site.getConfig()).toStrictEqual({ authEnabled: false, footerText: 'some-other-footer-text' });
        });
    });
});
