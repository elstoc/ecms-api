import { ImageData, ImageSize } from './IGalleryImage';

export type GalleryImages = {
    imageCount: number;
    images: ImageData[];
}

export interface IGallery {
    getImages(limit?: number): Promise<GalleryImages>;
    getImageFile(apiPath: string, size: ImageSize): Promise<Buffer>;
}
