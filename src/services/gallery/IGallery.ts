import { ImageMetadata, ImageSize } from './IGalleryImage';

export type GalleryContents = {
    imageCount: number;
    images: ImageMetadata[];
}

export interface IGallery {
    getContents(limit?: number): Promise<GalleryContents>;
    getImageFile(apiPath: string, size: ImageSize, timestamp: number): Promise<Buffer>;
}
