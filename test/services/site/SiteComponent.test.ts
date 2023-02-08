/* eslint-disable  @typescript-eslint/no-explicit-any */
import fs from 'fs';

import { SiteComponent } from '../../../src/services';
import { pathIsDirectory, pathIsFile, pathModifiedTime } from '../../../src/utils/site/fsUtils';

jest.mock('fs');
jest.mock('../../../src/utils/site/fsUtils');

const config = {
    cacheDir: '/path/to/cache',
    contentDir: '/path/to/content'
} as any;

const pathIsDirectoryMock = pathIsDirectory as jest.Mock;
const pathIsFileMock = pathIsFile as jest.Mock;
const pathModifiedTimeMock = pathModifiedTime as jest.Mock;

describe('That SiteComponent constructor', () => {
    beforeEach(() => {
        pathModifiedTimeMock.mockReturnValue(1234);
    });

    it('throws an error if the content directory does not exist', () => {
        pathIsDirectoryMock.mockReturnValueOnce(false);
        expect(() => new SiteComponent(config, 'apipath')).toThrowError('A content directory does not exist for the path apipath');
    });

    it('throws an error if the component file does not exist', () => {
        pathIsDirectoryMock.mockReturnValueOnce(true);
        pathIsFileMock.mockReturnValueOnce(false);
        expect(() => new SiteComponent(config, 'apipath')).toThrowError('A yaml file does not exist for the path apipath');
    });
});

describe('That SiteComponent.getMetadata', () => {
    let component: SiteComponent;

    beforeEach(() => {
        pathModifiedTimeMock.mockReturnValue(1234);
        pathIsFileMock.mockReturnValue(true);
        pathIsDirectoryMock.mockReturnValue(true);
    });

    it('attempts to parse component file yaml the first time it is called', () => {
        (fs.readFileSync as jest.Mock).mockReturnValue('uiPath: test\ntitle: The Title\ntype: gallery');
        const expectedMetadata = {
            uiPath: 'test',
            apiPath: 'my-component',
            title: 'The Title',
            type: 'gallery'
        };
        component = new SiteComponent(config, 'my-component');

        const actualMetadata = component.getMetadata();

        expect(fs.readFileSync).toBeCalledTimes(1);
        expect(fs.readFileSync).toBeCalledWith('/path/to/content/my-component.yaml', 'utf-8');
        expect(expectedMetadata).toStrictEqual(actualMetadata);
    });

    it('does not attempt to parse component file the second time it is called', () => {
        (fs.readFileSync as jest.Mock).mockReturnValue('uiPath: test\ntitle: The Title\ntype: gallery');
        const expectedMetadata = {
            uiPath: 'test',
            apiPath: 'my-component',
            title: 'The Title',
            type: 'gallery'
        };
        component = new SiteComponent(config, 'my-component');

        component.getMetadata();
        const actualMetadataAgain = component.getMetadata();

        expect(fs.readFileSync).toBeCalledTimes(1);
        expect(expectedMetadata).toStrictEqual(actualMetadataAgain);
    });

    it('attempts to re-parse component file if file becomes out of date', () => {
        (fs.readFileSync as jest.Mock).mockReturnValue('uiPath: test\ntitle: The Title\ntype: gallery');
        component = new SiteComponent(config, 'my-component');

        component.getMetadata();
        pathModifiedTimeMock.mockReturnValue(9999);
        component.getMetadata();

        expect(fs.readFileSync).toBeCalledTimes(2);
    });

    it('throws an error if the file does not contain any component type', () => {
        (fs.readFileSync as jest.Mock).mockReturnValue('uiPath: test\ntitle: The Title');
        component = new SiteComponent(config, 'my-component');

        expect(() => component.getMetadata()).toThrowError('Valid component type not found');
    });

    it('throws an error if the file contains an invalid component type', () => {
        (fs.readFileSync as jest.Mock).mockReturnValue('uiPath: test\ntitle: The Title\ntype: notgallery');
        component = new SiteComponent(config, 'my-component');

        expect(() => component.getMetadata()).toThrowError('Valid component type not found');
    });

    it('sets uiPath and title to apiPath if they do not exist', () => {
        (fs.readFileSync as jest.Mock).mockReturnValue('type: gallery');
        const expectedMetadata = {
            uiPath: 'my-component',
            apiPath: 'my-component',
            title: 'my-component',
            type: 'gallery'
        };
        component = new SiteComponent(config, 'my-component');

        const actualMetadata = component.getMetadata();

        expect(fs.readFileSync).toBeCalledTimes(1);
        expect(fs.readFileSync).toBeCalledWith('/path/to/content/my-component.yaml', 'utf-8');
        expect(expectedMetadata).toStrictEqual(actualMetadata);
    });

    it('throws an error if the file cannot be parsed', () => {
        (fs.readFileSync as jest.Mock).mockReturnValue('uiPath test\ntitle: The Title\ntype: notgallery');
        component = new SiteComponent(config, 'my-component');

        expect(() => component.getMetadata()).toThrowError();
    });
});
