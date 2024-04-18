import { ImageMetadata, ImageSize } from './IGalleryImage';

export type GalleryContents = {
    images: ImageMetadata[];
    allImageFiles?: string[];
}

export interface IGallery {
    getContents(limit?: number): Promise<GalleryContents>;
    getImageFile(apiPath: string, size: ImageSize, timestamp: string): Promise<Buffer>;
}
