/* eslint-disable  @typescript-eslint/no-explicit-any */
import { Site, SiteComponent } from '../../../src/services';

jest.mock('../../../src/services/site/SiteComponent');

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
    splitPath: jest.fn() as jest.Mock,
    getAdminFile: jest.fn() as jest.Mock,
    storeAdminFile: jest.fn() as jest.Mock,
    getAdminFileModifiedTime: jest.fn() as jest.Mock,
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
            expect(mockSiteComponent).toBeCalledTimes(3);
            expect(mockSiteComponent).toBeCalledWith(config, 'component01', mockStorage);
            expect(mockSiteComponent).toBeCalledWith(config, 'component02', mockStorage);
            expect(mockSiteComponent).toBeCalledWith(config, 'component03', mockStorage);

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
            expect(mockSiteComponent).toBeCalledTimes(4);
            expect(mockSiteComponent).toBeCalledWith(config, 'component01', mockStorage);
            expect(mockSiteComponent).toBeCalledWith(config, 'component02', mockStorage);
            expect(mockSiteComponent).toBeCalledWith(config, 'component03', mockStorage);
            expect(mockSiteComponent).toBeCalledWith(config, 'component04', mockStorage);

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
    });

    describe('getGalleryImages', () => {
        it('runs getImages on the appropriate gallery object', async () => {
            mockSiteComponent.mockImplementation((_, inputFilePath) => ({
                getGallery: () => ({ getImages: (limit: number) => `${inputFilePath}-${limit}-metadata` })
            }));

            const site = new Site(config, mockStorage);
            const actualGallerydata = await site.getGalleryImages('component01', 30);

            const expectedGallerydata = 'component01-30-metadata';
            expect(actualGallerydata).toBe(expectedGallerydata);
        });
    });

    describe('sendGalleryImage', () => {
        it('calls sendImageFile on the appropriate gallery object', async () => {
            const response = { } as any;
            const sendImageFile = jest.fn();
            mockSiteComponent.mockImplementation(() => ({
                getGallery: () => ({ sendImageFile })
            }));

            const site = new Site(config, mockStorage);
            await site.sendGalleryImage('component01/image1.jpg', 'thumb', response);

            expect(sendImageFile).toBeCalledWith('component01/image1.jpg', 'thumb', response);
        });
    });

    describe('getMarkdownStructure', () => {
        it('runs getMdStructure on the appropriate markdown object', async () => {
            mockSiteComponent.mockImplementation((_, inputFilePath) => ({
                getMarkdown: () => ({ getMdStructure: () => `${inputFilePath}-struct` })
            }));

            const site = new Site(config, mockStorage);
            const actualMarkdownStructure = await site.getMarkdownStructure('component02');

            const expectedMarkdownStructure = 'component02-struct';
            expect(actualMarkdownStructure).toBe(expectedMarkdownStructure);
        });
    });

    describe('sendMarkdownFile', () => {
        it('runs sendFile on the appropriate markdown object', async () => {
            const response = { } as any;
            const mockSendFile = jest.fn();
            mockSiteComponent.mockImplementation(() => ({
                getMarkdown: () => ({ sendFile: mockSendFile })
            }));

            const site = new Site(config, mockStorage);
            await site.sendMarkdownFile('component02/path/to/file', response as any);

            expect(mockSendFile).toBeCalledWith('component02/path/to/file', response);
        });
    });
});
