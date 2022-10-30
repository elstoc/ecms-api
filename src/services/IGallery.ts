export type Exif = {
    title: string | undefined;
    dateTaken: Date | undefined;
    camera: string | undefined;
    lens: string | undefined;
    exposure: string | undefined;
    iso: string | undefined;
    aperture: string | undefined;
    focalLength: string | undefined;
};

export type Dimensions = {
    width: number | undefined;
    height: number | undefined;
};

export type ImageData = {
    fileName: string;
    exif: Exif;
    thumbDimensions: Dimensions;
}

export interface IGallery {
    getGalleryData(relPath: string): Promise<ImageData[]>;
    getResizedImagePath(relPath: string): Promise<string>;
}
