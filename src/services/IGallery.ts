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

export type GalleryData = {
    imageCount: number;
    imageList: ImageData[];
}

export type SizeDesc = 'thumb' | 'full'

export interface IGallery {
    getGalleryData(relPath: string): Promise<GalleryData>;
    getResizedImagePath(relPath: string, sizeDesc: SizeDesc): Promise<string>;
}
