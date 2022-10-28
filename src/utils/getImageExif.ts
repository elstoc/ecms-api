import ExifReader from 'exifreader';

const parseExifDate = (date: string | undefined): Date | undefined => {
    if (date) {
        const a = date.split(/:| /).map((el: string) => parseInt(el));
        return new Date(a[0], a[1] - 1, a[2], a[3], a[4], a[5]);
    }
};

export type ExifData = {
    title: string | undefined;
    dateTaken: Date | undefined;
    camera: string | undefined;
    lens: string | undefined;
    exposure: string | undefined;
    iso: string | undefined;
    aperture: string | undefined;
    focalLength: string | undefined;
}

export const getImageExif = async (path: string): Promise<ExifData> => {
    const tags = await ExifReader.load(path, { expanded: true });
    return {
        title: tags.xmp?.title?.description,
        dateTaken: parseExifDate(tags.exif?.DateTimeOriginal?.description),
        camera: tags.exif?.Model?.description,
        lens: tags.exif?.LensModel?.description,
        exposure: tags.exif?.ExposureTime?.description,
        iso: tags.exif?.ISOSpeedRatings?.description?.toString(),
        aperture: tags.exif?.FNumber?.description,
        focalLength: tags.exif?.FocalLength?.description,
    };
};
