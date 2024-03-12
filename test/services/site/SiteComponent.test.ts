/* eslint-disable  @typescript-eslint/no-explicit-any */
import YAML from 'yaml';
import { Gallery } from '../../../src/services/gallery/Gallery';
import { Markdown } from '../../../src/services/markdown/Markdown';
import { MediaDb } from '../../../src/services/mediadb/MediaDb';
import { SiteComponent } from '../../../src/services';
import { NotFoundError } from '../../../src/errors';

jest.mock('yaml');
jest.mock('../../../src/services/gallery/Gallery');
jest.mock('../../../src/services/markdown/Markdown');
jest.mock('../../../src/services/mediadb/MediaDb');

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

const mockGallery = Gallery as jest.Mock;
const mockMarkdown = Markdown as jest.Mock;
const mockMediaDb = MediaDb as jest.Mock;
const contentFileBuf = Buffer.from('content-file');
const yamlParseMock = YAML.parse as jest.Mock;

describe('SiteComponent', () => {
    let component: SiteComponent;

    beforeEach(() => {
        component = new SiteComponent(config, 'my-component', mockStorage);
    });

    describe('getMetadata', () => {
        describe('throws an error', () => {
            it('if no yaml file is found', async () => {
                mockStorage.contentFileExists.mockReturnValue(false);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
    
                await expect(component.getMetadata()).rejects
                    .toThrow(new NotFoundError('A yaml file does not exist for the path my-component'));
                expect(mockStorage.contentFileExists).toHaveBeenCalledWith('my-component.yaml');
            });
    
            it('if no content directory is found', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(false);
    
                await expect(component.getMetadata()).rejects
                    .toThrow(new NotFoundError('A content directory does not exist for the path my-component'));
                expect(mockStorage.contentDirectoryExists).toHaveBeenCalledWith('my-component');
            });
    
            it('if the type is invalid', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    uiPath: 'test',
                    title: 'The Title',
                    type: 'invalid-type'
                });
    
                await expect(component.getMetadata()).rejects
                    .toThrow(new NotFoundError('Valid component type not found'));
            });
        });

        describe('returns metadata', () => {
            it('gets metadata by parsing the component file on the first run', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    uiPath: 'test',
                    title: 'The Title',
                    type: 'gallery',
                });
    
                const actualMetadata = await component.getMetadata();
    
                const expectedMetadata = {
                    uiPath: 'test',
                    apiPath: 'my-component',
                    title: 'The Title',
                    type: 'gallery',
                    additionalData: {}
                };
                expect(mockStorage.contentDirectoryExists).toHaveBeenCalled();
                expect(mockStorage.contentFileExists).toHaveBeenCalled();
                expect(mockStorage.getContentFileModifiedTime).toHaveBeenCalledWith('my-component.yaml');
                expect(mockStorage.getContentFile).toHaveBeenCalledWith('my-component.yaml');
                expect(yamlParseMock).toHaveBeenCalledWith(contentFileBuf.toString('utf-8'));
                expect(actualMetadata).toStrictEqual(expectedMetadata);
            });
    
            it('places any additional unidentified metadata into additionalData', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    uiPath: 'test',
                    title: 'The Title',
                    type: 'gallery',
                    anotherField: 'anotherValue',
                    aDifferentField: 'aDifferentValue'
                });
    
                const actualMetadata = await component.getMetadata();
    
                const expectedMetadata = {
                    uiPath: 'test',
                    apiPath: 'my-component',
                    title: 'The Title',
                    type: 'gallery',
                    additionalData: {
                        anotherField: 'anotherValue',
                        aDifferentField: 'aDifferentValue'
                    }
                };
                expect(actualMetadata).toStrictEqual(expectedMetadata);
            });
    
            it('gets identical metadata without parsing the component file on the second run (file unchanged)', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    uiPath: 'test',
                    title: 'The Title',
                    type: 'gallery',
                });
    
                const actualMetadata1 = await component.getMetadata();
                const actualMetadata2 = await component.getMetadata();
    
                const expectedMetadata = {
                    uiPath: 'test',
                    apiPath: 'my-component',
                    title: 'The Title',
                    type: 'gallery',
                    additionalData: {}
                };
                expect(mockStorage.contentDirectoryExists).toHaveBeenCalledTimes(2);
                expect(mockStorage.contentFileExists).toHaveBeenCalledTimes(2);
                expect(mockStorage.getContentFileModifiedTime).toHaveBeenCalledTimes(2);
                expect(mockStorage.getContentFile).toHaveBeenCalledTimes(1);
                expect(yamlParseMock).toHaveBeenCalledTimes(1);
                expect(actualMetadata1).toStrictEqual(expectedMetadata);
                expect(actualMetadata2).toStrictEqual(expectedMetadata);
            });
    
            it('attempts to re-parse component file if a newer file is present', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime
                    .mockReturnValueOnce(1234)
                    .mockReturnValue(2345);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValueOnce({
                    uiPath: 'test',
                    title: 'The Title',
                    type: 'gallery'
                }).mockReturnValue({
                    uiPath: 'test',
                    title: 'The New Title',
                    type: 'gallery'
                });
    
                const actualMetadata1 = await component.getMetadata();
                const actualMetadata2 = await component.getMetadata();
    
                const expectedMetadata1 = {
                    uiPath: 'test',
                    apiPath: 'my-component',
                    title: 'The Title',
                    type: 'gallery',
                    additionalData: {}
                };
                const expectedMetadata2 = { ...expectedMetadata1, title: 'The New Title' };
                expect(mockStorage.contentDirectoryExists).toHaveBeenCalledTimes(2);
                expect(mockStorage.contentFileExists).toHaveBeenCalledTimes(2);
                expect(mockStorage.getContentFileModifiedTime).toHaveBeenCalledTimes(2);
                expect(mockStorage.getContentFile).toHaveBeenCalledTimes(2);
                expect(yamlParseMock).toHaveBeenCalledTimes(2);
                expect(actualMetadata1).toStrictEqual(expectedMetadata1);
                expect(actualMetadata2).toStrictEqual(expectedMetadata2);
            });
    
            it('sets uiPath and title to apiPath if they do not exist', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    type: 'gallery'
                });
    
                const actualMetadata = await component.getMetadata();
    
                const expectedMetadata = {
                    uiPath: 'my-component',
                    apiPath: 'my-component',
                    title: 'my-component',
                    type: 'gallery',
                    additionalData: {}
                };
                expect(actualMetadata).toStrictEqual(expectedMetadata);
            });
        });
    
        describe('restricts access', () => {
            it('returns undefined if access is restricted and no user entered', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    uiPath: 'test',
                    title: 'The Title',
                    type: 'gallery',
                    restrict: 'admin'
                });
    
                const actualMetadata = await component.getMetadata();
    
                expect(actualMetadata).toBeUndefined();
            });
    
            it('returns undefined if access is restricted and user does not have permission', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    uiPath: 'test',
                    title: 'The Title',
                    type: 'gallery',
                    restrict: 'admin'
                });
    
                const actualMetadata = await component.getMetadata({ roles: ['role1', 'role2'] } as any);
    
                expect(actualMetadata).toBeUndefined();
            });
    
            it('returns correct metadata if access is restricted, user does not have permission but authentication is disabled', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    uiPath: 'test',
                    title: 'The Title',
                    type: 'gallery',
                    restrict: 'admin'
                });
                const newConfig = { ...config, enableAuthentication: false };
    
                component = new SiteComponent(newConfig, 'my-component', mockStorage);
                const actualMetadata = await component.getMetadata({ roles: ['role1', 'role2'] } as any);
    
                expect(actualMetadata).toBeDefined();
            });
    
            it('returns correct metadata if access is restricted and user has permission', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    uiPath: 'test',
                    title: 'The Title',
                    type: 'gallery',
                    restrict: 'role1'
                });
    
                const actualMetadata = await component.getMetadata({ roles: ['role1', 'role2'] } as any);
    
                expect(actualMetadata).toBeDefined();
            });
    
            it('returns correct metadata if user has admin access, regardless of restrictions', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    uiPath: 'test',
                    title: 'The Title',
                    type: 'gallery',
                    restrict: 'role1'
                });
    
                const actualMetadata = await component.getMetadata({ roles: ['admin'] } as any);
    
                expect(actualMetadata).toBeDefined();
            });
        });
    });

    describe('getGallery', () => {
        describe('throws an error', () => {
            it('if no yaml file is found', async () => {
                mockStorage.contentFileExists.mockReturnValue(false);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
    
                await expect(component.getGallery()).rejects
                    .toThrow(new NotFoundError('A yaml file does not exist for the path my-component'));
                expect(mockStorage.contentFileExists).toHaveBeenCalledWith('my-component.yaml');
            });
    
            it('if no content directory is found', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(false);
    
                await expect(component.getGallery()).rejects
                    .toThrow(new NotFoundError('A content directory does not exist for the path my-component'));
                expect(mockStorage.contentDirectoryExists).toHaveBeenCalledWith('my-component');
            });
    
            it('if the type is invalid', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    type: 'invalid-type'
                });
    
                await expect(component.getGallery()).rejects
                    .toThrow(new NotFoundError('Valid component type not found'));
            });

            it.each(['markdown', 'mediadb'])('when called for a %s component', async (type: string) => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    type
                });

                await expect(component.getGallery()).rejects
                    .toThrow(new NotFoundError('No gallery component found at the path my-component'));
            });
        });

        it('returns a Gallery object when called for a gallery component', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.contentDirectoryExists.mockReturnValue(true);
            mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            yamlParseMock.mockReturnValue({
                type: 'gallery'
            });
            (mockGallery).mockImplementation(() => ({
                name: 'mocked gallery'
            }));

            const galleryComponent = await component.getGallery();

            expect(galleryComponent).toEqual({ name: 'mocked gallery' });
        });
    });

    describe('getMarkdown', () => {
        describe('throws an error', () => {
            it('if no yaml file is found', async () => {
                mockStorage.contentFileExists.mockReturnValue(false);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
    
                await expect(component.getMarkdown()).rejects
                    .toThrow(new NotFoundError('A yaml file does not exist for the path my-component'));
                expect(mockStorage.contentFileExists).toHaveBeenCalledWith('my-component.yaml');
            });
    
            it('if no content directory is found', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(false);
    
                await expect(component.getMarkdown()).rejects
                    .toThrow(new NotFoundError('A content directory does not exist for the path my-component'));
                expect(mockStorage.contentDirectoryExists).toHaveBeenCalledWith('my-component');
            });
    
            it('if the type is invalid', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    type: 'invalid-type'
                });
    
                await expect(component.getMarkdown()).rejects
                    .toThrow(new NotFoundError('Valid component type not found'));
            });

            it.each(['gallery','mediadb'])('when called for a %s component', async (type: string) => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    type
                });
    
                await expect(component.getMarkdown()).rejects
                    .toThrow(new NotFoundError('No markdown component found at the path my-component'));
            });
        });

        it('returns a Markdown object when called for a markdown component', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.contentDirectoryExists.mockReturnValue(true);
            mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            yamlParseMock.mockReturnValue({
                type: 'markdown'
            });
            mockMarkdown.mockImplementation(() => ({
                name: 'mocked markdown'
            }));

            const markdownComponent = await component.getMarkdown();

            expect(markdownComponent).toEqual({ name: 'mocked markdown' });
        });
    });

    describe('getMediaDb', () => {
        describe('throws an error', () => {
            it('if no yaml file is found', async () => {
                mockStorage.contentFileExists.mockReturnValue(false);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
    
                await expect(component.getMediaDb()).rejects
                    .toThrow(new NotFoundError('A yaml file does not exist for the path my-component'));
                expect(mockStorage.contentFileExists).toHaveBeenCalledWith('my-component.yaml');
            });
    
            it('if no content directory is found', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(false);
    
                await expect(component.getMediaDb()).rejects
                    .toThrow(new NotFoundError('A content directory does not exist for the path my-component'));
                expect(mockStorage.contentDirectoryExists).toHaveBeenCalledWith('my-component');
            });
    
            it('if the type is invalid', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    type: 'invalid-type'
                });
    
                await expect(component.getMediaDb()).rejects
                    .toThrow(new NotFoundError('Valid component type not found'));
            });

            it.each(['markdown', 'gallery'])('when called for a %s component', async (type: string) => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    type
                });

                await expect(component.getMediaDb()).rejects
                    .toThrow(new NotFoundError('No mediadb component found at the path my-component'));
            });
        });

        it('returns a MediaDb object when called for a mediadb component', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.contentDirectoryExists.mockReturnValue(true);
            mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            yamlParseMock.mockReturnValue({
                type: 'mediadb'
            });
            (mockMediaDb).mockImplementation(() => ({
                name: 'mocked mediadb',
                initialise: () => true
            }));

            const mediaDbComponent = await component.getMediaDb();

            expect((mediaDbComponent as any)?.name).toEqual('mocked mediadb');
        });
    });

    describe('shutdown', () => {
        const initialise = jest.fn(),
            shutdown = jest.fn();

        beforeEach(() => {
            jest.resetAllMocks();
            mockMediaDb.mockImplementation(() => ({
                initialise,
                shutdown
            }));
        });

        it('calls mediaDb.shutdown if a mediaDb object has been created', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.contentDirectoryExists.mockReturnValue(true);
            mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            yamlParseMock.mockReturnValue({
                type: 'mediadb'
            });

            await component.getMediaDb();
            await component.shutdown();

            expect(shutdown).toHaveBeenCalledTimes(1);
        });

        it('does not calls mediaDb.shutdown if a mediaDb object has not been created', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.contentDirectoryExists.mockReturnValue(true);
            mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            yamlParseMock.mockReturnValue({
                type: 'mediadb'
            });

            await component.shutdown();

            expect(shutdown).toHaveBeenCalledTimes(0);
        });
    });
});
