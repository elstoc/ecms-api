import { ImageData, ImageSize } from './IGalleryImage';

export type GalleryData = {
    imageCount: number;
    imageList: ImageData[];
}

export interface IGallery {
    getMetadata(uiPath: string, limit?: number): Promise<GalleryData>,
    resizeImageAndGetPath(uiPath: string, size: ImageSize): Promise<string>
}
