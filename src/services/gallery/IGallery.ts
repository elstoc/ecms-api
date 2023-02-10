import { ImageData, ImageSize } from './IGalleryImage';

export type GalleryData = {
    imageCount: number;
    imageList: ImageData[];
}

export interface IGallery {
    getMetadata(limit?: number): Promise<GalleryData>,
    resizeImageAndGetPath(apiPath: string, size: ImageSize): Promise<string>
}
