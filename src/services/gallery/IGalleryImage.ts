import { Response } from 'express';

export type ImageSize = 'thumb' | 'fhd' | 'forExif';

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
    getMetadata(): Promise<ImageData>;
    sendFile(size: ImageSize, response: Response): Promise<void>;
}
