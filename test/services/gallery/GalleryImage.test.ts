/* eslint-disable  @typescript-eslint/no-explicit-any */
import { GalleryImage, IGalleryImage, ImageSize } from '../../../src/services/';
import { getExif, resizeImage, getImageDimensions } from '../../../src/utils';

jest.mock('../../../src/utils');

const dataDir = '/path/to/data';
const imagePath = 'gallery/image.jpg';

const config = {
    dataDir,
    url: 'site-url'
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

const getExifMock = getExif as jest.Mock;
const resizeImageMock = resizeImage as jest.Mock;
const getImageDimensionsMock = getImageDimensions as jest.Mock;

const RESIZE_OPTIONS = {
    thumb: { width: 100000, height: 350, quality: 60, stripExif: true, addBorder: true },
    fhd: { width: 2130, height: 1200, quality: 95, stripExif: true, addBorder: false },
    forExif: { width: 1, height: 1, quality: 0, stripExif: false, addBorder: false }
};

describe('GalleryImage', () => {
    let galleryImage: IGalleryImage;

    beforeEach(() => {
        galleryImage = new GalleryImage(config, imagePath, mockStorage);
    });

    describe('sendFile', () => {
        let response: any;

        beforeEach(() => {
            response = {
                send: jest.fn(),
                sendStatus: jest.fn()
            } as any;
        });

        it.each([
            'source',
            'test',
            'something'
        ])('throws an error if the size description is not valid - %s', async (size) => {
            await expect(galleryImage.sendFile(size as any, response))
                .rejects.toThrow('Incorrect size description');
        });

        it('throws an error if the source image does not exist', async () => {
            mockStorage.contentFileExists.mockReturnValue(false);

            await expect(galleryImage.sendFile('thumb', response))
                .rejects.toThrow(`Source file ${imagePath} does not exist`);
            expect(mockStorage.contentFileExists).toBeCalledWith(imagePath);
        });

        it.each([
            ['thumb', RESIZE_OPTIONS['thumb']],
            ['fhd', RESIZE_OPTIONS['fhd']],
        ])('attempts to resize, save and send the resulting file where the source exists and is newer - %s', async (size, imageParams) => {
            const sourceContentBuf = Buffer.from('source-content');
            const targetContentBuf = Buffer.from('target-content');
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.generatedFileIsOlder.mockReturnValue(true);
            mockStorage.getContentFile.mockResolvedValue(sourceContentBuf);
            resizeImageMock.mockResolvedValue(targetContentBuf);

            await galleryImage.sendFile(size as ImageSize, response);

            expect(resizeImageMock).toBeCalledWith(sourceContentBuf, imageParams);
            expect(mockStorage.storeGeneratedFile).toBeCalledWith(imagePath, size, targetContentBuf);
            expect(response.send).toBeCalledWith(targetContentBuf);

            expect(mockStorage.getGeneratedFile).not.toBeCalled();
        });

        it.each([
            'thumb',
            'fhd'
        ])('attempts to retrieve and send the resulting file where the source exists and is older - %s', async (size: string) => {
            const generatedContentBuf = Buffer.from('generated-content');
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.generatedFileIsOlder.mockReturnValue(false);
            mockStorage.getGeneratedFile.mockResolvedValue(generatedContentBuf);

            await galleryImage.sendFile(size as ImageSize, response);

            expect(mockStorage.getGeneratedFile).toBeCalledWith(imagePath, size);
            expect(response.send).toBeCalledWith(generatedContentBuf);

            expect(resizeImageMock).not.toBeCalled();
            expect(mockStorage.storeGeneratedFile).not.toBeCalled();
        });
    });

    describe('getImageData', () => {
        const originalFileBuf = Buffer.from('original-file');
        const thumbFileBuf = Buffer.from('thumb-file');
        const exifFileBuf = Buffer.from('exif-file');

        const sourceFileModifiedTime = 5000;

        const expectedMetadata = {
            fileName: 'image.jpg',
            description: 'my image',
            exif: { title: 'my image', ISO: '1000' },
            thumbDimensions: { width: 100, height: 200 },
            thumbSrcUrl: 'site-url/gallery/image/gallery/image.jpg?id=5000&size=thumb',
            fhdSrcUrl: 'site-url/gallery/image/gallery/image.jpg?id=5000&size=fhd'
        };

        beforeEach(() => {
            mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
            (getExifMock).mockReturnValue({ title: 'my image', ISO: '1000' });
            (getImageDimensionsMock).mockReturnValue({ width: 100, height: 200 });
        });

        it('throws an error if the source image does not exist', async () => {
            mockStorage.contentFileExists.mockReturnValue(false);
            await expect(galleryImage.getImageData())
                .rejects.toThrow('Source file gallery/image.jpg does not exist');
        });

        it('when no imageData is cached and generated files do not exist, get data from newly-resized files', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.generatedFileIsOlder.mockReturnValue(true);
            mockStorage.getContentFile.mockResolvedValue(originalFileBuf);
            mockStorage.getContentFileModifiedTime.mockReturnValue(sourceFileModifiedTime);
            resizeImageMock.mockImplementation((_, opts) => (
                opts.stripExif ? thumbFileBuf : exifFileBuf
            ));

            const actualMetadata = await galleryImage.getImageData();

            expect(actualMetadata).toStrictEqual(expectedMetadata);
            expect(getExif).toBeCalledTimes(1);
            expect(getExif).toBeCalledWith(exifFileBuf);
            expect(resizeImage).toBeCalledTimes(2);
            expect(resizeImage).toBeCalledWith(originalFileBuf, RESIZE_OPTIONS['forExif']);
            expect(resizeImage).toBeCalledWith(originalFileBuf, RESIZE_OPTIONS['thumb']);
            expect(getImageDimensions).toBeCalledTimes(1);
            expect(getImageDimensions).toBeCalledWith(thumbFileBuf);
        });

        it('returns identical metadata on second run without resizing and using cached data', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.generatedFileIsOlder
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(true)
                .mockReturnValue(false);
            mockStorage.getContentFile.mockResolvedValue(originalFileBuf);
            mockStorage.getContentFileModifiedTime.mockReturnValue(sourceFileModifiedTime);
            resizeImageMock.mockImplementation((_, opts) => (
                opts.stripExif ? thumbFileBuf : exifFileBuf
            ));

            const actualMetadata1 = await galleryImage.getImageData();
            const actualMetadata2 = await galleryImage.getImageData();

            expect(actualMetadata1).toStrictEqual(expectedMetadata);
            expect(actualMetadata2).toStrictEqual(actualMetadata1);

            //the following function calls are from the first call to getImageData
            expect(getExif).toBeCalledTimes(1);
            expect(resizeImage).toBeCalledTimes(2);
            expect(getImageDimensions).toBeCalledTimes(1);
        });

        it('resizes files and re-reads data when called a second time after source file has changed', async () => {
            const expectedMetadata2 = {
                ...expectedMetadata,
                thumbSrcUrl: 'site-url/gallery/image/gallery/image.jpg?id=7000&size=thumb',
                fhdSrcUrl: 'site-url/gallery/image/gallery/image.jpg?id=7000&size=fhd'
            };

            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.generatedFileIsOlder.mockReturnValue(true);
            mockStorage.getContentFile.mockResolvedValue(originalFileBuf);
            mockStorage.getContentFileModifiedTime
                .mockReturnValueOnce(5000)
                .mockReturnValue(7000);
            resizeImageMock.mockImplementation((_, opts) => (
                opts.stripExif ? thumbFileBuf : exifFileBuf
            ));

            const actualMetadata1 = await galleryImage.getImageData();
            const actualMetadata2 = await galleryImage.getImageData();

            expect(actualMetadata1).toStrictEqual(expectedMetadata);
            expect(actualMetadata2).toStrictEqual(expectedMetadata2);
            expect(getExif).toBeCalledTimes(2);
            expect(resizeImage).toBeCalledTimes(4);
            expect(getImageDimensions).toBeCalledTimes(2);
        });

        it('appends the date taken to the image description if present in exif', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.generatedFileIsOlder.mockReturnValue(true);
            mockStorage.getContentFile.mockResolvedValue(originalFileBuf);
            mockStorage.getContentFileModifiedTime.mockReturnValue(sourceFileModifiedTime);
            resizeImageMock.mockImplementation((_, opts) => (
                opts.stripExif ? thumbFileBuf : exifFileBuf
            ));
            getExifMock.mockReturnValue({ title: 'my image', ISO: '1000', dateTaken: '2012-03-15T12:49:34.000Z' });

            const expectedMetadataWithDate = {
                ...expectedMetadata,
                description: 'my image (Mar 2012)',
                exif: {
                    title: 'my image',
                    ISO: '1000',
                    dateTaken: '2012-03-15T12:49:34.000Z' 
                }
            };

            const actualMetadata = await galleryImage.getImageData();
            expect(actualMetadata).toStrictEqual(expectedMetadataWithDate);
        });
    });
});
