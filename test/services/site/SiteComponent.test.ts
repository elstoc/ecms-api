/* eslint-disable  @typescript-eslint/no-explicit-any */
import YAML from 'yaml';
import { Gallery } from '../../../src/services/gallery/Gallery';
import { MarkdownRecurse } from '../../../src/services/markdown/MarkdownRecurse';
import { SiteComponent } from '../../../src/services';
import { NotFoundError } from '../../../src/errors';

jest.mock('yaml');
jest.mock('../../../src/services/gallery/Gallery');
jest.mock('../../../src/services/markdown/MarkdownRecurse');

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

const mockGallery = Gallery as jest.Mock;
const mockMarkdown = MarkdownRecurse as jest.Mock;
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
                expect(mockStorage.contentFileExists).toBeCalledWith('my-component.yaml');
            });
    
            it('if no content directory is found', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(false);
    
                await expect(component.getMetadata()).rejects
                    .toThrow(new NotFoundError('A content directory does not exist for the path my-component'));
                expect(mockStorage.contentDirectoryExists).toBeCalledWith('my-component');
            });
    
            it('if the type is not markdown or gallery', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    uiPath: 'test',
                    title: 'The Title',
                    type: 'not-markdown-or-gallery'
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
                expect(mockStorage.contentDirectoryExists).toBeCalled();
                expect(mockStorage.contentFileExists).toBeCalled();
                expect(mockStorage.getContentFileModifiedTime).toBeCalledWith('my-component.yaml');
                expect(mockStorage.getContentFile).toBeCalledWith('my-component.yaml');
                expect(yamlParseMock).toBeCalledWith(contentFileBuf.toString('utf-8'));
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
                expect(mockStorage.contentDirectoryExists).toBeCalledTimes(2);
                expect(mockStorage.contentFileExists).toBeCalledTimes(2);
                expect(mockStorage.getContentFileModifiedTime).toBeCalledTimes(2);
                expect(mockStorage.getContentFile).toBeCalledTimes(1);
                expect(yamlParseMock).toBeCalledTimes(1);
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
                expect(mockStorage.contentDirectoryExists).toBeCalledTimes(2);
                expect(mockStorage.contentFileExists).toBeCalledTimes(2);
                expect(mockStorage.getContentFileModifiedTime).toBeCalledTimes(2);
                expect(mockStorage.getContentFile).toBeCalledTimes(2);
                expect(yamlParseMock).toBeCalledTimes(2);
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
                expect(mockStorage.contentFileExists).toBeCalledWith('my-component.yaml');
            });
    
            it('if no content directory is found', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(false);
    
                await expect(component.getGallery()).rejects
                    .toThrow(new NotFoundError('A content directory does not exist for the path my-component'));
                expect(mockStorage.contentDirectoryExists).toBeCalledWith('my-component');
            });
    
            it('if the type is not markdown or gallery', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    type: 'not-gallery-or-markdown'
                });
    
                await expect(component.getGallery()).rejects
                    .toThrow(new NotFoundError('Valid component type not found'));
            });

            it('when called for a markdown component', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    type: 'markdown'
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
                expect(mockStorage.contentFileExists).toBeCalledWith('my-component.yaml');
            });
    
            it('if no content directory is found', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(false);
    
                await expect(component.getMarkdown()).rejects
                    .toThrow(new NotFoundError('A content directory does not exist for the path my-component'));
                expect(mockStorage.contentDirectoryExists).toBeCalledWith('my-component');
            });
    
            it('if the type is not markdown or gallery', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    type: 'not-gallery-or-markdown'
                });
    
                await expect(component.getMarkdown()).rejects
                    .toThrow(new NotFoundError('Valid component type not found'));
            });

            it('when called for a gallery component', async () => {
                mockStorage.contentFileExists.mockReturnValue(true);
                mockStorage.contentDirectoryExists.mockReturnValue(true);
                mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
                mockStorage.getContentFile.mockResolvedValue(contentFileBuf);
                yamlParseMock.mockReturnValue({
                    type: 'gallery'
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
});
