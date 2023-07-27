import { Response } from 'express';
import { ImageData, ImageSize } from './IGalleryImage';

export type GalleryImages = {
    imageCount: number;
    images: ImageData[];
}

export interface IGallery {
    getImages(limit?: number): Promise<GalleryImages>;
    sendImageFile(apiPath: string, size: ImageSize, response: Response): Promise<void>;
}
