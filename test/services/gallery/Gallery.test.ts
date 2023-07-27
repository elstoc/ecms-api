/* eslint-disable  @typescript-eslint/no-explicit-any */
import fs from 'fs';

import { Gallery, GalleryImage } from '../../../src/services';

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    promises: {
        readdir: jest.fn()
    }
}));

jest.mock('../../../src/services/gallery/GalleryImage');

const config = {
    dataDir: '/path/to/data',
} as any;

describe('Gallery', () => {
    describe('getImages', () => {
        let gallery: Gallery;
    
        beforeEach(() => {
            gallery = new Gallery('gallery', config);
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
    
        it('only creates GalleryImage instances for files it has not seen before', async () => {
            await gallery.getImages(3);
            await gallery.getImages(3);
            expect(GalleryImage).toBeCalledTimes(3);
            await gallery.getImages(6);
            expect(GalleryImage).toBeCalledTimes(6);
            await gallery.getImages(9);
            expect(GalleryImage).toBeCalledTimes(9);
        });
    
        it('returns metadata for each file in reverse order (within defined limit), plus total count', async () => {
            (GalleryImage as jest.Mock).mockImplementation((_, inputFilePath) => ({
                getMetadata: () => ({ filePath: inputFilePath })
            }));
    
            const expectedReturnData = {
                imageCount: 12,
                images: [
                    { filePath: 'gallery/image12.jpg' },
                    { filePath: 'gallery/image11.jpg' },
                    { filePath: 'gallery/image10.jpg' },
                ]
            };
            const returnData = await gallery.getImages(3);
            expect(returnData).toStrictEqual(expectedReturnData);
        });
    
        it('returns metadata for each file in reverse order (with no limit), plus total count', async () => {
            (GalleryImage as jest.Mock).mockImplementation((_, inputFilePath) => ({
                getMetadata: () => ({ filePath: inputFilePath })
            }));
    
            const expectedReturnData = {
                imageCount: 12,
                images: [
                    { filePath: 'gallery/image12.jpg' },
                    { filePath: 'gallery/image11.jpg' },
                    { filePath: 'gallery/image10.jpg' },
                    { filePath: 'gallery/image09.jpg' },
                    { filePath: 'gallery/image08.jpg' },
                    { filePath: 'gallery/image07.jpg' },
                    { filePath: 'gallery/image06.jpg' },
                    { filePath: 'gallery/image05.jpg' },
                    { filePath: 'gallery/image04.jpg' },
                    { filePath: 'gallery/image03.jpg' },
                    { filePath: 'gallery/image02.jpg' },
                    { filePath: 'gallery/image01.jpg' },
                ]
            };
            const returnData = await gallery.getImages();
            expect(returnData).toStrictEqual(expectedReturnData);
        });
    
    });
    
    describe('sendImageFile', () => {
        let gallery: Gallery;
    
        beforeEach(() => {
            gallery = new Gallery('gallery', config);
        });
    
        it('creates a new image object and calls image.sendFile the first time it is called', async () => {
            const response = {} as any;
            const sendFile = jest.fn();
            (GalleryImage as jest.Mock).mockImplementation(() => ({
                sendFile
            }));
    
            await gallery.sendImageFile('gallery/image1.jpg', 'thumb', response);
    
            expect(GalleryImage).toBeCalledTimes(1);
            expect(sendFile).toBeCalledWith('thumb', response);
        });
    
        it('calls image.sendFile on the existing object the second time it is called', async () => {
            const response = {} as any;
            const sendFile = jest.fn();
            (GalleryImage as jest.Mock).mockImplementation(() => ({
                sendFile
            }));
    
            await gallery.sendImageFile('gallery/image1.jpg', 'thumb', response);
            await gallery.sendImageFile('gallery/image1.jpg', 'fhd', response);
    
            expect(GalleryImage).toBeCalledTimes(1);
            expect(sendFile).toBeCalledTimes(2);
            const path1Parms = sendFile.mock.calls[0];
            const path2Parms = sendFile.mock.calls[1];
            expect(path1Parms).toEqual(['thumb', response]);
            expect(path2Parms).toEqual(['fhd', response]);
        });
    });
});
