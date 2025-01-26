/* eslint-disable  @typescript-eslint/no-explicit-any */
import { NotFoundError, NotPermittedError } from '../../errors';
import { GalleryImage } from './GalleryImage';
import { getExif } from './utils/getExif';
import { getImageDimensions } from './utils/getImageDimensions';
import { resizeImage } from './utils/resizeImage';
import { RESIZE_OPTIONS } from './GalleryImage';
import { ImageSize } from '../../contracts/gallery';

jest.mock('./utils/getExif');
jest.mock('./utils/getImageDimensions');
jest.mock('./utils/resizeImage');

const dataDir = '/path/to/data';
const imagePath = 'gallery/image.jpg';

const config = {
    dataDir,
    apiUrl: 'site-url'
} as any;

const mockStorage = {
    contentFileExists: jest.fn() as jest.Mock,
    getContentFile: jest.fn() as jest.Mock,
    getGeneratedFile: jest.fn() as jest.Mock,
    storeGeneratedFile: jest.fn() as jest.Mock,
    generatedFileIsOlder: jest.fn() as jest.Mock,
    getContentFileModifiedTime: jest.fn() as jest.Mock,
} as any;

const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
} as any;

const getExifMock = getExif as jest.Mock;
const resizeImageMock = resizeImage as jest.Mock;
const getImageDimensionsMock = getImageDimensions as jest.Mock;

describe('GalleryImage', () => {
    let galleryImage: GalleryImage;

    beforeEach(() => {
        mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
        galleryImage = new GalleryImage(config, imagePath, mockStorage, mockLogger);
    });

    describe('getFile', () => {
        it.each([
            'source',
            'test',
            'something'
        ])('throws an error if the size description is not valid - %s', async (size) => {
            await expect(galleryImage.getFile(size as any, '1234'))
                .rejects.toThrow(new NotFoundError('Incorrect size description'));
        });

        it('throws an error if the source image does not exist', async () => {
            mockStorage.contentFileExists.mockReturnValue(false);

            await expect(galleryImage.getFile(ImageSize.thumb, '1234'))
                .rejects.toThrow(new NotFoundError(`Source file ${imagePath} does not exist`));
            expect(mockStorage.contentFileExists).toHaveBeenCalledWith(imagePath);
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

            const actualFileBuf = await galleryImage.getFile(size as ImageSize, '1234');

            expect(resizeImageMock).toHaveBeenCalledWith(sourceContentBuf, imageParams);
            expect(mockStorage.storeGeneratedFile).toHaveBeenCalledWith(imagePath, `${size}_v1`, targetContentBuf);
            expect(actualFileBuf).toBe(targetContentBuf);

            expect(mockStorage.getGeneratedFile).not.toHaveBeenCalled();
        });

        it.each([
            'thumb',
            'fhd'
        ])('attempts to retrieve and send the resulting file where the source exists and is older - %s', async (size: string) => {
            const generatedContentBuf = Buffer.from('generated-content');
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.generatedFileIsOlder.mockReturnValue(false);
            mockStorage.getGeneratedFile.mockResolvedValue(generatedContentBuf);

            const actualFileBuf = await galleryImage.getFile(size as ImageSize, '1234');

            expect(mockStorage.getGeneratedFile).toHaveBeenCalledWith(imagePath, `${size}_v1`);
            expect(actualFileBuf).toBe(generatedContentBuf);

            expect(resizeImageMock).not.toHaveBeenCalled();
            expect(mockStorage.storeGeneratedFile).not.toHaveBeenCalled();
        });

        it.each([
            'thumb',
            'fhd'
        ])('throws an error when an incorrect timestamp is passed - %s', async (size: string) => {
            mockStorage.contentFileExists.mockReturnValue(true);

            await expect(galleryImage.getFile(size as ImageSize, '999'))
                .rejects.toThrow(new NotPermittedError('incorrect timestamp given'));
            expect(mockStorage.getContentFileModifiedTime).toHaveBeenCalledWith(imagePath);
        });
    });

    describe('getImageMetadata', () => {
        const originalFileBuf = Buffer.from('original-file');
        const thumbFileBuf = Buffer.from('thumb-file');
        const exifFileBuf = Buffer.from('exif-file');

        const sourceFileModifiedTime = 5000;

        const expectedMetadata = {
            fileName: 'image.jpg',
            description: 'my image',
            exif: { title: 'my image', ISO: '1000' },
            thumbDimensions: { width: 100, height: 200 },
            thumbSrcUrl: 'site-url/gallery/image/?path=gallery/image.jpg&timestamp=5000&size=thumb&version=1',
            fhdSrcUrl: 'site-url/gallery/image/?path=gallery/image.jpg&timestamp=5000&size=fhd&version=1'
        };

        beforeEach(() => {
            mockStorage.getContentFileModifiedTime.mockReturnValue(1234);
            (getExifMock).mockReturnValue({ title: 'my image', ISO: '1000' });
            (getImageDimensionsMock).mockReturnValue({ width: 100, height: 200 });
        });

        it('throws an error if the source image does not exist', async () => {
            mockStorage.contentFileExists.mockReturnValue(false);
            await expect(galleryImage.getImageMetadata())
                .rejects.toThrow(new NotFoundError('Source file gallery/image.jpg does not exist'));
        });

        it('when no imageData is cached and generated files do not exist, get data from newly-resized files', async () => {
            mockStorage.contentFileExists.mockReturnValue(true);
            mockStorage.generatedFileIsOlder.mockReturnValue(true);
            mockStorage.getContentFile.mockResolvedValue(originalFileBuf);
            mockStorage.getContentFileModifiedTime.mockReturnValue(sourceFileModifiedTime);
            resizeImageMock.mockImplementation((_, opts) => (
                opts.stripExif ? thumbFileBuf : exifFileBuf
            ));

            const actualMetadata = await galleryImage.getImageMetadata();

            expect(actualMetadata).toStrictEqual(expectedMetadata);
            expect(getExif).toHaveBeenCalledTimes(1);
            expect(getExif).toHaveBeenCalledWith(exifFileBuf);
            expect(resizeImage).toHaveBeenCalledTimes(2);
            expect(resizeImage).toHaveBeenCalledWith(originalFileBuf, RESIZE_OPTIONS['forExif']);
            expect(resizeImage).toHaveBeenCalledWith(originalFileBuf, RESIZE_OPTIONS['thumb']);
            expect(getImageDimensions).toHaveBeenCalledTimes(1);
            expect(getImageDimensions).toHaveBeenCalledWith(thumbFileBuf);
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

            const actualMetadata1 = await galleryImage.getImageMetadata();
            const actualMetadata2 = await galleryImage.getImageMetadata();

            expect(actualMetadata1).toStrictEqual(expectedMetadata);
            expect(actualMetadata2).toStrictEqual(actualMetadata1);

            //the following function calls are from the first call to getImageMetadata
            expect(getExif).toHaveBeenCalledTimes(1);
            expect(resizeImage).toHaveBeenCalledTimes(2);
            expect(getImageDimensions).toHaveBeenCalledTimes(1);
        });

        it('resizes files and re-reads data when called a second time after source file has changed', async () => {
            const expectedMetadata2 = {
                ...expectedMetadata,
                thumbSrcUrl: 'site-url/gallery/image/?path=gallery/image.jpg&timestamp=7000&size=thumb&version=1',
                fhdSrcUrl: 'site-url/gallery/image/?path=gallery/image.jpg&timestamp=7000&size=fhd&version=1'
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

            const actualMetadata1 = await galleryImage.getImageMetadata();
            const actualMetadata2 = await galleryImage.getImageMetadata();

            expect(actualMetadata1).toStrictEqual(expectedMetadata);
            expect(actualMetadata2).toStrictEqual(expectedMetadata2);
            expect(getExif).toHaveBeenCalledTimes(2);
            expect(resizeImage).toHaveBeenCalledTimes(4);
            expect(getImageDimensions).toHaveBeenCalledTimes(2);
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

            const actualMetadata = await galleryImage.getImageMetadata();
            expect(actualMetadata).toStrictEqual(expectedMetadataWithDate);
        });
    });
});
