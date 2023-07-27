import { Response } from 'express';
import { ImageData, ImageSize } from './IGalleryImage';

export type GalleryData = {
    imageCount: number;
    imageList: ImageData[];
}

export interface IGallery {
    getMetadata(limit?: number): Promise<GalleryData>;
    sendFile(apiPath: string, size: ImageSize, response: Response): Promise<void>;
}
