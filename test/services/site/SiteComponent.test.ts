/* eslint-disable  @typescript-eslint/no-explicit-any */
import YAML from 'yaml';
import { Gallery } from '../../../src/services/gallery/Gallery';
import { Markdown } from '../../../src/services/markdown/Markdown';
import { VideoDb } from '../../../src/services/videodb/VideoDb';
import { SiteComponent } from '../../../src/services';
import { NotFoundError } from '../../../src/errors';

jest.mock('yaml');
jest.mock('../../../src/services/gallery/Gallery');
jest.mock('../../../src/services/markdown/Markdown');
jest.mock('../../../src/services/videodb/VideoDb');

const config = {
    dataDir: '/path/to/data',
    enableAuthentication: true
} as any;

const mockStorage = {
    contentFileExists: jest.fn() as jest.Mock,
    getContentFile: jest.fn() as jest.Mock,
    getContentFileModifiedTime: jest.fn() as jest.Mock,
    contentDirectoryExists: jest.fn() as jest.Mock,
};
const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
} as any;

const mockGallery = Gallery as jest.Mock;
const mockMarkdown = Markdown as jest.Mock;
const mockVideoDb = VideoDb as jest.Mock;
const contentFileBuf = Buffer.from('content-file');
const yamlParseMock = YAML.parse as jest.Mock;

describe('SiteComponent', () => {
    let component: SiteComponent;

    beforeEach(() => {
        component = new SiteComponent(config, 'my-component', mockStorage as any, mockLogger);
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

            it('if weight is present but non-numeric', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    uiPath: 'test',
                    title: 'The Title',
                    type: 'gallery',
                    weight: 'boo'
                });
    
                await expect(component.getMetadata()).rejects
                    .toThrow(new NotFoundError('Component weight must be numeric'));
            });

            describe('for gallery components', () => {
                beforeEach(() => {
                    mockStorage.contentFileExists.mockReturnValue(true);
                    mockStorage.contentDirectoryExists.mockReturnValue(true);
                    mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                    mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                });

                it('if marginPx is not a number', async () => {
                    yamlParseMock.mockReturnValue({
                        uiPath: 'test',
                        title: 'The Title',
                        type: 'gallery',
                        marginPx: 'boo',
                        batchSize: 3,
                        threshold: 4
                    });
        
                    await expect(component.getMetadata()).rejects
                        .toThrow(new NotFoundError('Gallery components must include marginPx, batchSize and threshold as numbers'));
                });

                it('if batchSize is not a number', async () => {
                    yamlParseMock.mockReturnValue({
                        uiPath: 'test',
                        title: 'The Title',
                        type: 'gallery',
                        marginPx: 3,
                        batchSize: 'boo',
                        threshold: 4
                    });
        
                    await expect(component.getMetadata()).rejects
                        .toThrow(new NotFoundError('Gallery components must include marginPx, batchSize and threshold as numbers'));
                });

                it('if threshold is not a number', async () => {
                    yamlParseMock.mockReturnValue({
                        uiPath: 'test',
                        title: 'The Title',
                        type: 'gallery',
                        marginPx: 3,
                        batchSize: 4,
                        threshold: 'boo'
                    });
        
                    await expect(component.getMetadata()).rejects
                        .toThrow(new NotFoundError('Gallery components must include marginPx, batchSize and threshold as numbers'));
                });
            });

            describe('for markdown components', () => {
                it('if includeNav is not boolean', async () => {
                    mockStorage.contentFileExists.mockReturnValue(true);
                    mockStorage.contentDirectoryExists.mockReturnValue(true);
                    mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                    mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                    yamlParseMock.mockReturnValue({
                        uiPath: 'test',
                        title: 'The Title',
                        type: 'markdown',
                        includeNav: 'boo'
                    });
        
                    await expect(component.getMetadata()).rejects
                        .toThrow(new NotFoundError('Markdown components must include the includeNav parameter as a boolean'));
                });
            });
        });

        describe('returns metadata', () => {
            it('correctly returns metadata for gallery component', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    uiPath: 'test',
                    title: 'The Title',
                    type: 'gallery',
                    marginPx: 1,
                    batchSize: 2,
                    threshold: 3
                });
    
                const actualMetadata = await component.getMetadata();
    
                const expectedMetadata = {
                    uiPath: 'test',
                    apiPath: 'my-component',
                    title: 'The Title',
                    type: 'gallery',
                    marginPx: 1,
                    batchSize: 2,
                    threshold: 3
                };
                expect(actualMetadata).toEqual(expectedMetadata);
            });

            it('correctly returns metadata for markdown component', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    uiPath: 'test',
                    title: 'The Title',
                    type: 'markdown',
                    includeNav: true
                });
    
                const actualMetadata = await component.getMetadata();
    
                const expectedMetadata = {
                    uiPath: 'test',
                    apiPath: 'my-component',
                    title: 'The Title',
                    type: 'markdown',
                    includeNav: true
                };
                expect(actualMetadata).toEqual(expectedMetadata);
            });

            it('correctly returns metadata for videodb component', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    uiPath: 'test',
                    title: 'The Title',
                    type: 'videodb',
                });
    
                const actualMetadata = await component.getMetadata();
    
                const expectedMetadata = {
                    uiPath: 'test',
                    apiPath: 'my-component',
                    title: 'The Title',
                    type: 'videodb',
                };
                expect(actualMetadata).toEqual(expectedMetadata);
            });
            it('gets metadata by parsing the component file on the first run', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    uiPath: 'test',
                    title: 'The Title',
                    type: 'videodb',
                });
    
                const actualMetadata = await component.getMetadata();
    
                const expectedMetadata = {
                    uiPath: 'test',
                    apiPath: 'my-component',
                    title: 'The Title',
                    type: 'videodb',
                };
                expect(mockStorage.contentDirectoryExists).toHaveBeenCalled();
                expect(mockStorage.contentFileExists).toHaveBeenCalled();
                expect(mockStorage.getContentFileModifiedTime).toHaveBeenCalledWith('my-component.yaml');
                expect(mockStorage.getContentFile).toHaveBeenCalledWith('my-component.yaml');
                expect(yamlParseMock).toHaveBeenCalledWith(contentFileBuf.toString('utf-8'));
                expect(actualMetadata).toEqual(expectedMetadata);
            });
    
            it('gets identical metadata without parsing the component file on the second run (file unchanged)', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    uiPath: 'test',
                    title: 'The Title',
                    type: 'videodb',
                });
    
                const actualMetadata1 = await component.getMetadata();
                const actualMetadata2 = await component.getMetadata();
    
                const expectedMetadata = {
                    uiPath: 'test',
                    apiPath: 'my-component',
                    title: 'The Title',
                    type: 'videodb',
                };
                expect(mockStorage.contentDirectoryExists).toHaveBeenCalledTimes(2);
                expect(mockStorage.contentFileExists).toHaveBeenCalledTimes(2);
                expect(mockStorage.getContentFileModifiedTime).toHaveBeenCalledTimes(2);
                expect(mockStorage.getContentFile).toHaveBeenCalledTimes(1);
                expect(yamlParseMock).toHaveBeenCalledTimes(1);
                expect(actualMetadata1).toEqual(expectedMetadata);
                expect(actualMetadata2).toEqual(expectedMetadata);
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
                    type: 'videodb'
                }).mockReturnValue({
                    uiPath: 'test',
                    title: 'The New Title',
                    type: 'videodb'
                });
    
                const actualMetadata1 = await component.getMetadata();
                const actualMetadata2 = await component.getMetadata();
    
                const expectedMetadata1 = {
                    uiPath: 'test',
                    apiPath: 'my-component',
                    title: 'The Title',
                    type: 'videodb',
                };
                const expectedMetadata2 = { ...expectedMetadata1, title: 'The New Title' };
                expect(mockStorage.contentDirectoryExists).toHaveBeenCalledTimes(2);
                expect(mockStorage.contentFileExists).toHaveBeenCalledTimes(2);
                expect(mockStorage.getContentFileModifiedTime).toHaveBeenCalledTimes(2);
                expect(mockStorage.getContentFile).toHaveBeenCalledTimes(2);
                expect(yamlParseMock).toHaveBeenCalledTimes(2);
                expect(actualMetadata1).toEqual(expectedMetadata1);
                expect(actualMetadata2).toEqual(expectedMetadata2);
            });
    
            it('sets uiPath and title to apiPath if they do not exist', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    type: 'videodb'
                });
    
                const actualMetadata = await component.getMetadata();
    
                const expectedMetadata = {
                    uiPath: 'my-component',
                    apiPath: 'my-component',
                    title: 'my-component',
                    type: 'videodb',
                };
                expect(actualMetadata).toEqual(expectedMetadata);
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
                    type: 'videodb',
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
                    type: 'videodb',
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
                    type: 'videodb',
                    restrict: 'admin'
                });
                const newConfig = { ...config, enableAuthentication: false };
    
                component = new SiteComponent(newConfig, 'my-component', mockStorage as any, mockLogger);
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
                    type: 'videodb',
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
                    type: 'videodb',
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

            it.each(['markdown', 'videodb'])('when called for a %s component', async (type: string) => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    type, marginPx: 1, batchSize: 2, threshold: 3, includeNav: true
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
                type: 'gallery', marginPx: 1, batchSize: 2, threshold: 3
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

            it.each(['gallery','videodb'])('when called for a %s component', async (type: string) => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    type, marginPx: 1, batchSize: 2, threshold: 3, includeNav: true
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
                type: 'markdown',
                includeNav: true
            });
            mockMarkdown.mockImplementation(() => ({
                name: 'mocked markdown'
            }));

            const markdownComponent = await component.getMarkdown();

            expect(markdownComponent).toEqual({ name: 'mocked markdown' });
        });
    });

    describe('getVideoDb', () => {
        describe('throws an error', () => {
            it('if no yaml file is found', async () => {
                mockStorage.contentFileExists.mockReturnValue(false);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
    
                await expect(component.getVideoDb()).rejects
                    .toThrow(new NotFoundError('A yaml file does not exist for the path my-component'));
                expect(mockStorage.contentFileExists).toHaveBeenCalledWith('my-component.yaml');
            });
    
            it('if no content directory is found', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(false);
    
                await expect(component.getVideoDb()).rejects
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
    
                await expect(component.getVideoDb()).rejects
                    .toThrow(new NotFoundError('Valid component type not found'));
            });

            it.each(['markdown', 'gallery'])('when called for a %s component', async (type: string) => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    type, marginPx: 1, batchSize: 2, threshold: 3, includeNav: true
                });

                await expect(component.getVideoDb()).rejects
                    .toThrow(new NotFoundError('No videodb component found at the path my-component'));
            });
        });

        it('returns a VideoDb object when called for a videodb component', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.contentDirectoryExists.mockReturnValue(true);
            mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            yamlParseMock.mockReturnValue({
                type: 'videodb'
            });
            (mockVideoDb).mockImplementation(() => ({
                name: 'mocked videodb',
                initialise: () => true
            }));

            const videoDbComponent = await component.getVideoDb();

            expect((videoDbComponent as any)?.name).toEqual('mocked videodb');
        });
    });

    describe('shutdown', () => {
        const initialise = jest.fn(),
            shutdown = jest.fn();

        beforeEach(() => {
            jest.resetAllMocks();
            mockVideoDb.mockImplementation(() => ({
                initialise,
                shutdown
            }));
        });

        it('calls videoDb.shutdown if a videoDb object has been created', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.contentDirectoryExists.mockReturnValue(true);
            mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            yamlParseMock.mockReturnValue({
                type: 'videodb'
            });

            await component.getVideoDb();
            await component.shutdown();

            expect(shutdown).toHaveBeenCalledTimes(1);
        });

        it('does not calls videoDb.shutdown if a videoDb object has not been created', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.contentDirectoryExists.mockReturnValue(true);
            mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
            mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
            yamlParseMock.mockReturnValue({
                type: 'videodb'
            });

            await component.shutdown();

            expect(shutdown).toHaveBeenCalledTimes(0);
        });
    });
});
