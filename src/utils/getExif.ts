import ExifReader from 'exifreader';

const exifDateToISO = (date: string | undefined): string | undefined => {
    if (!date) return undefined;
    const a = date.split(/[: ]/).map((el: string) => parseInt(el));
    return (new Date(a[0], a[1] - 1, a[2], a[3], a[4], a[5])).toISOString();
};

export const getExif = async (fullPath: string): Promise<{ [key: string]: string | undefined }> => {
    const tags = await ExifReader.load(fullPath, { expanded: true });
    return {
        title: tags.xmp?.title?.description,
        dateTaken: exifDateToISO(tags.exif?.DateTimeOriginal?.description),
        camera: tags.exif?.Model?.description,
        lens: tags.exif?.LensModel?.description,
        exposure: tags.exif?.ExposureTime?.description,
        iso: tags.exif?.ISOSpeedRatings?.description?.toString(),
        aperture: tags.exif?.FNumber?.description,
        focalLength: tags.exif?.FocalLength?.description,
    };
};
