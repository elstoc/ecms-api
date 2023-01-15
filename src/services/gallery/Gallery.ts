import fs from 'fs';

import { IGallery, GalleryData } from './IGallery';
import { GalleryImage } from './GalleryImage';
import { ImageData, ImageSize } from './IGalleryImage';
import { SitePaths } from '../site';

export class Gallery implements IGallery {
    private imageCache: { [key: string]: GalleryImage } = {};

    public constructor(
        private paths: SitePaths
    ) { }

    public async getMetadata(uiPath: string, limit?: number): Promise<GalleryData> {
        const galleryFullPath = this.paths.getContentPathIfExists(uiPath);

        const imageFileNames = (await this.getJpegFileNames(galleryFullPath)).sort().reverse();
        const imageCount = imageFileNames.length;

        const imageList = await Promise.all(
            imageFileNames
                .slice(0, limit)
                .map((fileName) => this.getImageMetadata(`${uiPath}/${fileName}`))
        );

        return { imageCount, imageList };
    }

    private async getImageMetadata(uiPath: string): Promise<ImageData> {
        const image = this.getGalleryImage(uiPath);
        return await image.getMetadata();
    }

    public async resizeImageAndGetPath(uiPath: string, size: ImageSize): Promise<string> {
        const image = this.getGalleryImage(uiPath);
        return await image.resizeAndGetPath(size);
    }

    private getGalleryImage(uiPath: string): GalleryImage {
        let image = this.imageCache[uiPath];
        if (!image) {
            image = new GalleryImage(this.paths, uiPath);
            this.imageCache[uiPath] = image;
        }
        return image;
    }

    private async getJpegFileNames(inDir: string): Promise<string[]> {
        const dir = await fs.promises.readdir(inDir);
        return dir.filter((file) => file.endsWith('.jpg'));
    }
}
