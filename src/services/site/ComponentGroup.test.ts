/* eslint-disable  @typescript-eslint/no-explicit-any */
import { ComponentGroup, Component } from '..';

jest.mock('./Component');

const config = {
    dataDir: '/path/to/data',
    enableAuthentication: true
} as any;

const mockStorage = {
    listContentChildren: jest.fn() as jest.Mock,
};

const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
} as any;

const mockComponent = Component as jest.Mock;

describe('RootComponent', () => {
    describe('list', () => {
        let componentGroup: ComponentGroup;
        
        it('only attempts to process yaml files in the content directory (ignores other files/extensions/directories)', async () => {
            mockComponent.mockImplementation((_, inputFilePath) => ({
                getMetadata: () => ({ apiPath: inputFilePath })
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

            componentGroup = new ComponentGroup(config, mockStorage as any, mockLogger, 'parent');
            const actualComponentList = await componentGroup.list();

            const expectedComponentList = [
                { apiPath: 'parent/component01' },
                { apiPath: 'parent/component02' },
                { apiPath: 'parent/component03' },
            ];
            expect(mockComponent).toHaveBeenCalledTimes(3);
            expect(mockComponent).toHaveBeenCalledWith(config, 'parent/component01', mockStorage, mockLogger);
            expect(mockComponent).toHaveBeenCalledWith(config, 'parent/component02', mockStorage, mockLogger);
            expect(mockComponent).toHaveBeenCalledWith(config, 'parent/component03', mockStorage, mockLogger);

            expect(actualComponentList).toStrictEqual(expectedComponentList);
        });

        it('only creates new Component instances for yaml files it has not seen before', async () => {
            mockComponent.mockImplementation((_, inputFilePath) => ({
                getMetadata: () => ({ apiPath: inputFilePath })
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

            componentGroup = new ComponentGroup(config, mockStorage as any, mockLogger, '');
            const actualComponentList1 = await componentGroup.list();
            const actualComponentList2 = await componentGroup.list();

            const expectedComponentList1 = [
                { apiPath: 'component01' },
                { apiPath: 'component02' },
                { apiPath: 'component03' },
            ];
            const expectedComponentList2 = [...expectedComponentList1, { apiPath: 'component04' }];
            expect(mockComponent).toHaveBeenCalledTimes(4);
            expect(mockComponent).toHaveBeenCalledWith(config, 'component01', mockStorage, mockLogger);
            expect(mockComponent).toHaveBeenCalledWith(config, 'component02', mockStorage, mockLogger);
            expect(mockComponent).toHaveBeenCalledWith(config, 'component03', mockStorage, mockLogger);
            expect(mockComponent).toHaveBeenCalledWith(config, 'component04', mockStorage, mockLogger);

            expect(actualComponentList1).toStrictEqual(expectedComponentList1);
            expect(actualComponentList2).toStrictEqual(expectedComponentList2);
        });

        it('no longer sends metadata for files that have been deleted', async () => {
            mockComponent.mockImplementation((_, inputFilePath) => ({
                getMetadata: () => ({ apiPath: inputFilePath })
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

            componentGroup = new ComponentGroup(config, mockStorage as any, mockLogger, '');
            const actualComponentList1 = await componentGroup.list();
            const actualComponentList2 = await componentGroup.list();

            const expectedComponentList2 = [
                { apiPath: 'component01' },
                { apiPath: 'component02' },
                { apiPath: 'component03' },
            ];
            const expectedComponentList1 = [...expectedComponentList2, { apiPath: 'component04' }];

            expect(actualComponentList1).toStrictEqual(expectedComponentList1);
            expect(actualComponentList2).toStrictEqual(expectedComponentList2);
        });

        it('sorts weighted components first, ascending numerically by weight, then unweighted components ascending alphabetically by title', async () => {
            (Component as jest.Mock).mockImplementation((_, inputFilePath) => ({
                getMetadata: () => {
                    const returnData = { apiPath: inputFilePath, title: inputFilePath } as any;
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

            componentGroup = new ComponentGroup(config, mockStorage as any, mockLogger, '');
            const actualNavData = await componentGroup.list();

            const expectedNavData = [
                { apiPath: 'componentE', title: 'componentE', weight: 10 },
                { apiPath: 'componentG', title: 'componentG', weight: 20 },
                { apiPath: 'componentB', title: 'componentB', weight: 30 },
                { apiPath: 'componentA', title: 'componentA' },
                { apiPath: 'componentC', title: 'componentC' },
                { apiPath: 'componentD', title: 'componentD' },
                { apiPath: 'componentF', title: 'componentF' },
            ];
            expect(actualNavData).toStrictEqual(expectedNavData);
        });

        it('filters out any undefined metadata returned by the component (due to no permission)', async () => {
            mockComponent.mockImplementation((_, inputFilePath) => ({
                getMetadata: () => (inputFilePath.endsWith('01') ? undefined : { apiPath: inputFilePath })
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

            componentGroup = new ComponentGroup(config, mockStorage as any, mockLogger, '');
            const actualComponentList = await componentGroup.list();

            const expectedComponentList = [
                { apiPath: 'component02' },
                { apiPath: 'component03' },
            ];
            expect(actualComponentList).toStrictEqual(expectedComponentList);
        });

    });

    describe('getGallery', () => {
        it('gets the appropriate gallery object', async () => {
            const site = new ComponentGroup(config, mockStorage as any, mockLogger, 'parent');
            mockComponent.mockImplementation((_, inputFilePath) => ({
                getGallery: () => inputFilePath
            }));
            const gallery = await site.getGallery('parent/galleryComponent/foo/bar');

            expect(gallery).toBe('parent/galleryComponent');
        });
    });

    describe('getMarkdown', () => {
        it('gets the appropriate markdown object', async () => {
            const site = new ComponentGroup(config, mockStorage as any, mockLogger, 'parent');
            mockComponent.mockImplementation((_, inputFilePath) => ({
                getMarkdown: () => inputFilePath
            }));
            const markdown = await site.getMarkdown('parent/markdownComponent/foo/bar');

            expect(markdown).toBe('parent/markdownComponent');
        });
    });

    describe('getVideoDb', () => {
        it('gets the appropriate videodb object', async () => {
            const site = new ComponentGroup(config, mockStorage as any, mockLogger, 'parent');
            mockComponent.mockImplementation((_, inputFilePath) => ({
                getVideoDb: () => inputFilePath
            }));
            const videodb = await site.getVideoDb('parent/videoDbComponent/foo/bar');

            expect(videodb).toBe('parent/videoDbComponent');
        });
    });

    describe('shutdown', () => {
        it('runs shutdown on every created site component', async () => {
            const mockShutdown = jest.fn();
            mockComponent.mockImplementation((_, inputFilePath) => ({
                getMetadata: () => ({ apiPath: inputFilePath }),
                shutdown: mockShutdown
            }));
            mockStorage.listContentChildren.mockImplementation(async (_, fileMatcher) => {
                return [
                    'component01.yaml',
                    'component02.yaml',
                    'component03.yaml',
                ].filter(fileMatcher);
            });

            const componentGroup = new ComponentGroup(config, mockStorage as any, mockLogger, '');
            await componentGroup.list(); // required to create the components that are to be shut down

            await componentGroup.shutdown();

            expect(mockShutdown).toHaveBeenCalledTimes(3);
        });
    });
});
