export enum ImageSize {
    thumb = 'thumb',
    fhd = 'fhd',
    forExif = 'forExif'
}

export type Dimensions = {
    width: number | undefined;
    height: number | undefined;
};

export type ImageData = {
    fileName: string;
    description?: string;
    exif: { [key: string]: string | undefined };
    thumbDimensions: Dimensions;
    thumbSrcUrl?: string;
    fhdSrcUrl?: string;
}

export interface IGalleryImage {
    getImageData(): Promise<ImageData>;
    getFile(size: ImageSize): Promise<Buffer>;
}
