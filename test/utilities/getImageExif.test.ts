import { ExifData, getImageExif } from '../../src/utilities/getImageExif';

describe('That the getImageExif function', () => {
    it('returns an empty object if no exif data exists', async () => {
        const expectedResult: ExifData = {
            title: undefined,
            dateTaken: undefined,
            camera: undefined,
            lens: undefined,
            exposure: undefined,
            iso: undefined,
            aperture: undefined,
            focalLength: undefined,
        };

        const actualResult = await getImageExif('./test/utilities/artifacts/portchester-without-exif.jpg');

        expect(expectedResult).toEqual(actualResult);
    });

    it('returns valid data if exif does exist', async () => {
        const expectedResult: ExifData = {
            title: 'Portchester Castle, Portsmouth',
            dateTaken: new Date('2020-02-18T11:25:23.000Z'),
            camera: 'Canon EOS 760D',
            lens: 'EF-S55-250mm f/4-5.6 IS STM',
            exposure: '1/320',
            iso: '125',
            aperture: 'f/9',
            focalLength: '229 mm',
        };

        const actualResult = await getImageExif('./test/utilities/artifacts/portchester-with-exif.jpg');

        expect(expectedResult).toEqual(actualResult);
    });
});
