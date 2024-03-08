/* eslint-disable  @typescript-eslint/no-explicit-any */
import { getExif } from '../../../src/utils';
import ExifReader from 'exifreader';
const fileContents = 'some-file-content';
const fileBuffer = Buffer.from(fileContents);

describe('getExif', () => {

    it('Loads exif using expanded parameter', () => {
        const mockExifLoad = jest.spyOn(ExifReader, 'load');
        mockExifLoad.mockReturnValue({} as any);

        getExif(fileBuffer);

        expect(ExifReader.load).toHaveBeenCalledWith(fileBuffer, { expanded: true, length: 128 * 1024 });
    });

    it('correctly reformats dateTaken to ISO format', () => {
        const exifReaderOut = {
            exif: {
                DateTimeOriginal: {
                    description: '2022:12:30 13:23:24'
                }
            }
        };
        const expectedOutput = '2022-12-30T13:23:24.000Z';

        const mockExifLoad = jest.spyOn(ExifReader, 'load');
        mockExifLoad.mockReturnValue(exifReaderOut as any);

        const tags = getExif(fileBuffer);

        expect(tags.dateTaken).toMatch(expectedOutput);
    });

    it('correctly extracts other exif data items', () => {
        const exifReaderOut = {
            xmp: {
                title: { description: 'the title' }
            },
            exif: {
                Model: { description: 'Canon Camera' },
                LensModel: { description: 'Canon Lens' },
                ExposureTime: { description: '5 seconds' },
                ISOSpeedRatings: { description: 100 },
                FNumber: { description: 'f4' },
                FocalLength: { description: '50mm' },
            }
        };

        const expectedOutput = {
            title: 'the title',
            camera: 'Canon Camera',
            lens: 'Canon Lens',
            dateTaken: undefined,
            exposure: '5 seconds',
            iso: '100',
            aperture: 'f4',
            focalLength: '50mm'
        };

        const mockExifLoad = jest.spyOn(ExifReader, 'load');
        mockExifLoad.mockReturnValue(exifReaderOut as any);

        const tags = getExif(fileBuffer);

        expect(tags).toStrictEqual(expectedOutput);
    });

    it('throws any error ', () => {
        const mockExifLoad = jest.spyOn(ExifReader, 'load');
        mockExifLoad.mockImplementation(() => {
            throw new Error('Error');
        });

        expect(() => getExif(fileBuffer)).toThrow('Error');
    });
});
