/* eslint-disable  @typescript-eslint/no-explicit-any */
import fs from 'fs';
import { Gallery } from '../../../src/services/gallery/Gallery';
import { MarkdownRecurse } from '../../../src/services/markdown/MarkdownRecurse';
import { SiteComponent } from '../../../src/services';
import { pathIsDirectory, pathIsFile, pathModifiedTime } from '../../../src/utils/site/fs';
import { IStorageAdapter } from '../../../src/adapters/IStorageAdapter';

jest.mock('fs');
jest.mock('../../../src/utils/site/fs');
jest.mock('../../../src/services/gallery/Gallery');
jest.mock('../../../src/services/markdown/MarkdownRecurse');

const config = {
    dataDir: '/path/to/data',
} as any;

const pathIsDirectoryMock = pathIsDirectory as jest.Mock;
const pathIsFileMock = pathIsFile as jest.Mock;
const pathModifiedTimeMock = pathModifiedTime as jest.Mock;
const GalleryMock = Gallery as jest.Mock;
const MarkdownRecurseMock = MarkdownRecurse as jest.Mock;

let mockStorageAdapter: jest.MockedObject<IStorageAdapter>;

describe('SiteComponent', () => {
    describe('constructor', () => {
        beforeEach(() => {
            pathModifiedTimeMock.mockReturnValue(1234);
        });

        it('throws an error if the content directory does not exist', () => {
            pathIsDirectoryMock.mockReturnValueOnce(false);
            expect(() => new SiteComponent(config, 'apipath', mockStorageAdapter)).toThrowError('A content directory does not exist for the path apipath');
        });

        it('throws an error if the component file does not exist', () => {
            pathIsDirectoryMock.mockReturnValueOnce(true);
            pathIsFileMock.mockReturnValueOnce(false);
            expect(() => new SiteComponent(config, 'apipath', mockStorageAdapter)).toThrowError('A yaml file does not exist for the path apipath');
        });

        it('throws an error if the file does not contain any component type', () => {
            pathIsDirectoryMock.mockReturnValueOnce(true);
            pathIsFileMock.mockReturnValueOnce(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('uiPath: test\ntitle: The Title');
            expect(() => new SiteComponent(config, 'apipath', mockStorageAdapter)).toThrowError('Valid component type not found');
        });

        it('throws an error if the file contains an invalid component type', () => {
            pathIsDirectoryMock.mockReturnValueOnce(true);
            pathIsFileMock.mockReturnValueOnce(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('uiPath: test\ntitle: The Title\ntype: notgallery');
            expect(() => new SiteComponent(config, 'apipath', mockStorageAdapter)).toThrowError('Valid component type not found');
        });

        it('throws an error if the file cannot be parsed', () => {
            pathIsDirectoryMock.mockReturnValueOnce(true);
            pathIsFileMock.mockReturnValueOnce(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('uiPath test\ntitle: The Title\ntype: notgallery');
            expect(() => new SiteComponent(config, 'apipath', mockStorageAdapter)).toThrowError();
        });

        it('attempts to parse component file yaml', () => {
            pathIsDirectoryMock.mockReturnValueOnce(true);
            pathIsFileMock.mockReturnValueOnce(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('uiPath: test\ntitle: The Title\ntype: gallery');
            new SiteComponent(config, 'my-component', mockStorageAdapter);

            expect(fs.readFileSync).toBeCalledTimes(1);
            expect(fs.readFileSync).toBeCalledWith('/path/to/data/content/my-component.yaml', 'utf-8');
        });

        it('creates a Markdown root object if the component type is "markdown"', () => {
            pathIsDirectoryMock.mockReturnValueOnce(true);
            pathIsFileMock.mockReturnValueOnce(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('uiPath: test\ntitle: The Title\ntype: markdown');
            new SiteComponent(config, 'my-component', mockStorageAdapter);
            expect(GalleryMock).toBeCalledTimes(0);
            expect(MarkdownRecurseMock).toBeCalledTimes(1);
        });

        it('creates a Gallery root object if the component type is "gallery"', () => {
            pathIsDirectoryMock.mockReturnValueOnce(true);
            pathIsFileMock.mockReturnValueOnce(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('uiPath: test\ntitle: The Title\ntype: gallery');
            new SiteComponent(config, 'my-component', mockStorageAdapter);
            expect(GalleryMock).toBeCalledTimes(1);
            expect(MarkdownRecurseMock).toBeCalledTimes(0);
        });
    });

    describe('getMetadata', () => {
        let component: SiteComponent;

        beforeEach(() => {
            pathModifiedTimeMock.mockReturnValue(1234);
            pathIsFileMock.mockReturnValue(true);
            pathIsDirectoryMock.mockReturnValue(true);
        });

        it('gets metadata without re-parsing the component file (after object creation)', () => {
            (fs.readFileSync as jest.Mock).mockReturnValue('uiPath: test\ntitle: The Title\ntype: gallery');
            const expectedMetadata = {
                uiPath: 'test',
                apiPath: 'my-component',
                title: 'The Title',
                type: 'gallery'
            };
            component = new SiteComponent(config, 'my-component', mockStorageAdapter);

            const actualMetadata = component.getMetadata();

            expect(fs.readFileSync).toBeCalledTimes(1);
            expect(expectedMetadata).toStrictEqual(actualMetadata);
        });

        it('attempts to re-parse component file if file becomes out of date', () => {
            (fs.readFileSync as jest.Mock).mockReturnValue('uiPath: test\ntitle: The Title\ntype: gallery');
            component = new SiteComponent(config, 'my-component', mockStorageAdapter);

            pathModifiedTimeMock.mockReturnValue(9999);
            component.getMetadata();

            expect(fs.readFileSync).toBeCalledTimes(2);
        });

        it('sets uiPath and title to apiPath if they do not exist', () => {
            (fs.readFileSync as jest.Mock).mockReturnValue('type: gallery');
            const expectedMetadata = {
                uiPath: 'my-component',
                apiPath: 'my-component',
                title: 'my-component',
                type: 'gallery'
            };
            component = new SiteComponent(config, 'my-component', mockStorageAdapter);

            const actualMetadata = component.getMetadata();

            expect(fs.readFileSync).toBeCalledTimes(1);
            expect(fs.readFileSync).toBeCalledWith('/path/to/data/content/my-component.yaml', 'utf-8');
            expect(expectedMetadata).toStrictEqual(actualMetadata);
        });
    });

    describe('getGallery', () => {
        let component: SiteComponent;

        it('returns a Gallery object if this is a gallery path', () => {
            pathIsDirectoryMock.mockReturnValueOnce(true);
            pathIsFileMock.mockReturnValueOnce(true);
            (GalleryMock).mockImplementation(() => ({
                name: 'mocked gallery'
            }));
            (fs.readFileSync as jest.Mock).mockReturnValue('uiPath: test\ntitle: The Title\ntype: gallery');
            component = new SiteComponent(config, 'my-component', mockStorageAdapter);
            const galleryComponent = component.getGallery();
            expect(galleryComponent).toEqual({ name: 'mocked gallery' });
        });

        it('throws an error if this is not a gallery path', () => {
            pathIsDirectoryMock.mockReturnValueOnce(true);
            pathIsFileMock.mockReturnValueOnce(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('uiPath: test\ntitle: The Title\ntype: markdown');
            component = new SiteComponent(config, 'my-component', mockStorageAdapter);
            expect(() => component.getGallery()).toThrowError('No gallery component at this path');
        });
    });

    describe('getMarkdown', () => {
        let component: SiteComponent;

        it('returns a Markdown object if this is a markdown path', () => {
            pathIsDirectoryMock.mockReturnValueOnce(true);
            pathIsFileMock.mockReturnValueOnce(true);
            (MarkdownRecurseMock).mockImplementation(() => ({
                name: 'mocked markdown'
            }));
            (fs.readFileSync as jest.Mock).mockReturnValue('uiPath: test\ntitle: The Title\ntype: markdown');
            component = new SiteComponent(config, 'my-component', mockStorageAdapter);
            const galleryComponent = component.getMarkdown();
            expect(galleryComponent).toEqual({ name: 'mocked markdown'});
        });

        it('throws an error if this is not a markdown path', () => {
            pathIsDirectoryMock.mockReturnValueOnce(true);
            pathIsFileMock.mockReturnValueOnce(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('uiPath: test\ntitle: The Title\ntype: gallery');
            component = new SiteComponent(config, 'my-component', mockStorageAdapter);
            expect(() => component.getMarkdown()).toThrowError('No markdown component at this path');
        });
    });
});
