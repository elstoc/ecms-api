import { ImageMetadata, ImageSize } from './IGalleryImage';

export type GalleryContents = {
    imageCount: number;
    images: ImageMetadata[];
}

export interface IGallery {
    getImages(limit?: number): Promise<GalleryContents>;
    getImageFile(apiPath: string, size: ImageSize): Promise<Buffer>;
}
