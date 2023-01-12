import { ImageData, ImageSize } from './IGalleryImage';

export type GalleryData = {
    imageCount: number;
    imageList: ImageData[];
}

export interface IGallery {
    getMetadata(relPath: string, limit?: number): Promise<GalleryData>,
    resizeImageAndGetPath(relPath: string, size: ImageSize): Promise<string>
}
