export type ImageSize = 'thumb' | 'fhd';

export type Dimensions = {
    width: number | undefined;
    height: number | undefined;
};

export type ImageData = {
    fileName: string;
    sourceModificationTime: number;
    exif: { [key: string]: string | undefined };
    thumbDimensions: Dimensions;
}

export interface IGalleryImage {
    getMetadata(): Promise<ImageData>
}
