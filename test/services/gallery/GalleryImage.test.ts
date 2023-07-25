/* eslint-disable  @typescript-eslint/no-explicit-any */
import fs from 'fs';

import { GalleryImage } from '../../../src/services/';
import { getExif, resizeImage, getImageDimensions, pathModifiedTime } from '../../../src/utils';

jest.mock('fs');
jest.mock('../../../src/utils');

const config = {
    cacheDir: '/path/to/cache',
    contentDir: '/path/to/content',
    url: 'site-url'
} as any;

const pathModifiedTimeMock = pathModifiedTime as jest.Mock;

describe('GalleryImage', () => {
    describe('constructor', () => {
        it('Throws an error if the source image does not exist', () => {
            pathModifiedTimeMock.mockReturnValue(0);
            expect(() => new GalleryImage(config, 'gallery/image.jpg'))
                .toThrow('File /path/to/content/gallery/image.jpg does not exist');

        });
    });

    describe('resizeAndGetPath', () => {
        beforeEach(() => {
            pathModifiedTimeMock.mockReturnValue(1234);
        });

        it.each([
            'source',
            'test',
            'something'
        ])('throws an error if the size description is not valid', async (size) => {
            const galleryImage = new GalleryImage(config, 'gallery/image.jpg');
            await expect(galleryImage.resizeAndGetPath(size as any))
                .rejects.toThrow('Incorrect size description');
        });

        it('throws an error if the source image does not exist', async () => {
            const galleryImage = new GalleryImage(config, 'gallery/image.jpg');
            pathModifiedTimeMock.mockReturnValue(0);
            await expect(galleryImage.resizeAndGetPath('thumb'))
                .rejects.toThrow('File /path/to/content/gallery/image.jpg does not exist');
        });

        it.each([
            'thumb',
            'fhd'
        ])('returns the correct path when the size description is valid and source file exists', async (size) => {
            const galleryImage = new GalleryImage(config, 'gallery/image.jpg');
            await expect(galleryImage.resizeAndGetPath(size as any))
                .resolves.toBe(`/path/to/cache/gallery/${size}/image.jpg`);
        });

        it('does not resize the cached file if it is newer than the source and returns correct path', async () => {
            pathModifiedTimeMock.mockImplementation((filePath: string) => (
                filePath.startsWith('/path/to/cache') ? 5000 : 1000
            ));

            const galleryImage = new GalleryImage(config, 'gallery/image.jpg');

            await expect(galleryImage.resizeAndGetPath('thumb' as any))
                .resolves.toBe('/path/to/cache/gallery/thumb/image.jpg');
            expect(resizeImage).toBeCalledTimes(0);
        });

        it.each([
            ['thumb', { width: 100000, height: 350, quality: 60 }],
            ['fhd', { width: 2130, height: 1200, quality: 95 }],
        ])('resizes the cached file with correct params if it is older than the source and returns correct path', async (size, imgParams) => {

            pathModifiedTimeMock.mockImplementation((filePath: string) => (
                filePath.startsWith('/path/to/cache') ? 1000 : 5000
            ));

            const galleryImage = new GalleryImage(config, 'gallery/image.jpg');

            await expect(galleryImage.resizeAndGetPath(size as any))
                .resolves.toBe(`/path/to/cache/gallery/${size}/image.jpg`);
            expect(resizeImage).toBeCalledTimes(1);
            expect(resizeImage).toBeCalledWith(
                '/path/to/content/gallery/image.jpg',
                `/path/to/cache/gallery/${size}/image.jpg`,
                imgParams.width,
                imgParams.height,
                imgParams.quality
            );
        });

        it.each([
            'thumb',
            'fhd'
        ])('attempts to create the cached image directory when resizing if it does not exist', async (size) => {
            pathModifiedTimeMock.mockImplementation((filePath: string) => (
                filePath.startsWith('/path/to/cache') ? 0 : 5000
            ));
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const galleryImage = new GalleryImage(config, 'gallery/image.jpg');
            await galleryImage.resizeAndGetPath(size as any);
            expect(fs.mkdirSync).toBeCalledTimes(1);
            expect(fs.mkdirSync).toBeCalledWith(`/path/to/cache/gallery/${size}`, { recursive: true });
        });

        it.each([
            'thumb',
            'fhd'
        ])('does not attempt to create the cached image directory when resizing if it does exist', async (size) => {
            pathModifiedTimeMock.mockImplementation((filePath: string) => (
                filePath.startsWith('/path/to/cache') ? 1000 : 5000
            ));
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const galleryImage = new GalleryImage(config, 'gallery/image.jpg');
            await galleryImage.resizeAndGetPath(size as any);
            expect(fs.mkdirSync).toBeCalledTimes(0);
        });

    });

    describe('getMetadata', () => {

        beforeEach(() => {
            pathModifiedTimeMock.mockReturnValue(1234);
            (getExif as jest.Mock).mockReturnValue({ title: 'my image', ISO: '1000' });
            (getImageDimensions as jest.Mock).mockReturnValue({ width: 100, height: 200 });
        });

        it('throws an error if the source image does not exist', async () => {
            const galleryImage = new GalleryImage(config, 'gallery/image.jpg');
            pathModifiedTimeMock.mockReturnValue(0);
            await expect(galleryImage.getMetadata())
                .rejects.toThrow('File /path/to/content/gallery/image.jpg does not exist');
        });

        it('retrieves and returns expected data from image files on first run with no thumb (thumb file resized)', async () => {
            const expectedMetadata = {
                fileName: 'image.jpg',
                description: 'my image',
                exif: { title: 'my image', ISO: '1000' },
                thumbDimensions: { width: 100, height: 200 },
                thumbSrcUrl: 'site-url/gallery/image/gallery/image.jpg?id=5000&size=thumb',
                fhdSrcUrl: 'site-url/gallery/image/gallery/image.jpg?id=5000&size=fhd'
            };

            pathModifiedTimeMock.mockImplementation((filePath: string) => (
                filePath.startsWith('/path/to/cache') ? 0 : 5000
            ));

            const galleryImage = new GalleryImage(config, 'gallery/image.jpg');
            const metadata = await galleryImage.getMetadata();
            expect(metadata).toStrictEqual(expectedMetadata);
            expect(getExif).toBeCalledTimes(1);
            expect(resizeImage).toBeCalledTimes(1);
            expect(getImageDimensions).toBeCalledTimes(1);
        });

        it('returns identical metadata on second run without resizing and using cached data', async () => {
            const expectedMetadata = {
                fileName: 'image.jpg',
                description: 'my image',
                exif: { title: 'my image', ISO: '1000' },
                thumbDimensions: { width: 100, height: 200 },
                thumbSrcUrl: 'site-url/gallery/image/gallery/image.jpg?id=5000&size=thumb',
                fhdSrcUrl: 'site-url/gallery/image/gallery/image.jpg?id=5000&size=fhd'
            };

            pathModifiedTimeMock.mockImplementation((filePath: string) => (
                filePath.startsWith('/path/to/cache') ? 100 : 5000
            ));

            const galleryImage = new GalleryImage(config, 'gallery/image.jpg');
            const metadata1 = await galleryImage.getMetadata();

            const metadata2 = await galleryImage.getMetadata();

            expect(metadata1).toStrictEqual(expectedMetadata);
            expect(metadata2).toStrictEqual(metadata1);
            expect(getExif).toBeCalledTimes(1);
            expect(resizeImage).toBeCalledTimes(1);
            expect(getImageDimensions).toBeCalledTimes(1);
        });

        it('resizes thumb, re-reads exif/dimensions, when called a second time and source has changed', async () => {
            const expectedMetadata = {
                fileName: 'image.jpg',
                description: 'my image',
                exif: { title: 'my image', ISO: '1000' },
                thumbDimensions: { width: 100, height: 200 },
                thumbSrcUrl: 'site-url/gallery/image/gallery/image.jpg?id=5000&size=thumb',
                fhdSrcUrl: 'site-url/gallery/image/gallery/image.jpg?id=5000&size=fhd'
            };

            const expectedMetadata2 = {
                fileName: 'image.jpg',
                description: 'my image title',
                exif: { title: 'my image title', ISO: '2000' },
                thumbDimensions: { width: 200, height: 300 },
                thumbSrcUrl: 'site-url/gallery/image/gallery/image.jpg?id=7000&size=thumb',
                fhdSrcUrl: 'site-url/gallery/image/gallery/image.jpg?id=7000&size=fhd'
            };

            pathModifiedTimeMock.mockImplementation((filePath: string) => (
                filePath.startsWith('/path/to/cache') ? 100 : 5000
            ));

            const galleryImage = new GalleryImage(config, 'gallery/image.jpg');
            const metadata1 = await galleryImage.getMetadata();

            pathModifiedTimeMock.mockImplementation((filePath: string) => (
                filePath.startsWith('/path/to/cache') ? 6000 : 7000
            ));

            (getExif as jest.Mock).mockReturnValue({ title: 'my image title', ISO: '2000' });
            (getImageDimensions as jest.Mock).mockReturnValue({ width: 200, height: 300 });

            const metadata2 = await galleryImage.getMetadata();

            expect(metadata1).toStrictEqual(expectedMetadata);
            expect(metadata2).toStrictEqual(expectedMetadata2);
            expect(getExif).toBeCalledTimes(2);
            expect(resizeImage).toBeCalledTimes(2);
            expect(getImageDimensions).toBeCalledTimes(2);
        });

        it('appends the date taken to the image description if present in exif', async () => {
            (getExif as jest.Mock).mockReturnValue({ title: 'my image', ISO: '1000', dateTaken: '2012-03-15T12:49:34.000Z' });
            const expectedMetadata = {
                fileName: 'image.jpg',
                description: 'my image (Mar 2012)',
                exif: { title: 'my image', ISO: '1000', dateTaken: '2012-03-15T12:49:34.000Z' },
                thumbDimensions: { width: 100, height: 200 },
                thumbSrcUrl: 'site-url/gallery/image/gallery/image.jpg?id=5000&size=thumb',
                fhdSrcUrl: 'site-url/gallery/image/gallery/image.jpg?id=5000&size=fhd'
            };

            pathModifiedTimeMock.mockImplementation((filePath: string) => (
                filePath.startsWith('/path/to/cache') ? 0 : 5000
            ));

            const galleryImage = new GalleryImage(config, 'gallery/image.jpg');
            const metadata = await galleryImage.getMetadata();
            expect(metadata).toStrictEqual(expectedMetadata);
        });

    });
});
