/* eslint-disable  @typescript-eslint/no-explicit-any */
import fs from 'fs';

import { Gallery, GalleryImage, SitePaths } from '../../../src/services';

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    promises: {
        readdir: jest.fn()
    }
}));

jest.mock('../../../src/services/gallery/GalleryImage');

const config = {
    cacheDir: '/path/to/cache',
    contentDir: '/path/to/content'
} as any;

describe('That Gallery.getMetadata', () => {
    let sitePaths: SitePaths;
    let gallery: Gallery;

    beforeEach(() => {
        sitePaths = new SitePaths(config);
        gallery = new Gallery(sitePaths);
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.promises.readdir as jest.Mock).mockResolvedValue([
            'image12.jpg',
            'image01.jpg',
            'image03.jpg',
            'image02.jpg',
            'image04.jpg',
            'image06.jpg',
            'image05.jpg',
            'image07.jpg',
            'image08.jpg',
            'image09.jpg',
            'image10.jpg',
            'image11.jpg',
            'notimage.txt'
        ]);
    });

    it('Throws an error if the source directory does not exist', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        await expect(gallery.getMetadata('/path/to/content/gallery'))
            .rejects.toThrow('File "/path/to/content/gallery" does not exist');
    });

    it('Only creates GalleryImage instances for files it has not seen before', async () => {
        await gallery.getMetadata('/path/to/content/gallery', 3);
        await gallery.getMetadata('/path/to/content/gallery', 3);
        expect(GalleryImage).toBeCalledTimes(3);
        await gallery.getMetadata('/path/to/content/gallery', 6);
        expect(GalleryImage).toBeCalledTimes(6);
        await gallery.getMetadata('/path/to/content/gallery', 9);
        expect(GalleryImage).toBeCalledTimes(9);
    });

    it('Returns metadata for each file in reverse order (within defined limit), plus total count', async () => {
        (GalleryImage as jest.Mock).mockImplementation((_, inputFilePath) => ({
            getMetadata: () => ({ filePath: inputFilePath })
        }));

        const expectedReturnData = {
            imageCount: 12,
            imageList: [
                { filePath: '/path/to/content/gallery/image12.jpg' },
                { filePath: '/path/to/content/gallery/image11.jpg' },
                { filePath: '/path/to/content/gallery/image10.jpg' },
            ]
        };
        const returnData = await gallery.getMetadata('/path/to/content/gallery', 3);
        expect(returnData).toStrictEqual(expectedReturnData);
    });

    it('Returns metadata for each file in reverse order (with no limit), plus total count', async () => {
        (GalleryImage as jest.Mock).mockImplementation((_, inputFilePath) => ({
            getMetadata: () => ({ filePath: inputFilePath })
        }));

        const expectedReturnData = {
            imageCount: 12,
            imageList: [
                { filePath: '/path/to/content/gallery/image12.jpg' },
                { filePath: '/path/to/content/gallery/image11.jpg' },
                { filePath: '/path/to/content/gallery/image10.jpg' },
                { filePath: '/path/to/content/gallery/image09.jpg' },
                { filePath: '/path/to/content/gallery/image08.jpg' },
                { filePath: '/path/to/content/gallery/image07.jpg' },
                { filePath: '/path/to/content/gallery/image06.jpg' },
                { filePath: '/path/to/content/gallery/image05.jpg' },
                { filePath: '/path/to/content/gallery/image04.jpg' },
                { filePath: '/path/to/content/gallery/image03.jpg' },
                { filePath: '/path/to/content/gallery/image02.jpg' },
                { filePath: '/path/to/content/gallery/image01.jpg' },
            ]
        };
        const returnData = await gallery.getMetadata('/path/to/content/gallery');
        expect(returnData).toStrictEqual(expectedReturnData);
    });

});

describe('That Gallery.resizeImageAndGetPath', () => {
    let sitePaths: SitePaths;
    let gallery: Gallery;

    beforeEach(() => {
        sitePaths = new SitePaths(config);
        gallery = new Gallery(sitePaths);
    });

    it('creates a new image object and calls image.resizeAndGetPath the first time it is called', async () => {
        (GalleryImage as jest.Mock).mockImplementation((_, filePath) => ({
            resizeAndGetPath: (size: string) => `${filePath}/${size}`
        }));

        const path = await gallery.resizeImageAndGetPath('gallery/image1.jpg', 'thumb');

        expect(GalleryImage).toBeCalledTimes(1);
        expect(path).toBe('gallery/image1.jpg/thumb');
    });

    it('calls image.resizeAndGetPath on the existing object the second time it is called', async () => {
        (GalleryImage as jest.Mock).mockImplementation((_, filePath) => ({
            resizeAndGetPath: (size: string) => `${filePath}/${size}`
        }));

        const path = await gallery.resizeImageAndGetPath('gallery/image1.jpg', 'thumb');
        const path2 = await gallery.resizeImageAndGetPath('gallery/image1.jpg', 'fhd');

        expect(GalleryImage).toBeCalledTimes(1);
        expect(path).toBe('gallery/image1.jpg/thumb');
        expect(path2).toBe('gallery/image1.jpg/fhd');
    });
});
