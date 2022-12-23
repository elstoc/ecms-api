import fs from 'fs';

import { GalleryData, ImageData } from './IGallery';
import { GalleryImage, ImageSize } from './GalleryImage';
import { SitePaths } from './SitePaths';

export class Gallery {
    private galleryImageCache: { [key: string]: GalleryImage } = {};

    public constructor(
        private paths: SitePaths
    ) { }

    public async getMetadata(relPath: string, limit?: number): Promise<GalleryData> {
        const galleryDir = this.paths.getContentPathIfExists(relPath);

        const imageFileNames = (await this.getJpegFileNames(galleryDir)).sort().reverse();
        const imageCount = imageFileNames.length;

        const imageList = await Promise.all(
            imageFileNames
                .slice(0, limit)
                .map((fileName) => this.getImageMetadata(`${relPath}/${fileName}`))
        );

        return { imageCount, imageList };
    }

    private async getImageMetadata(relPath: string): Promise<ImageData> {
        const image = this.getImage(relPath);
        return await image.getMetadata();
    }

    public async resizeImageAndGetPath(relPath: string, size: ImageSize): Promise<string> {
        const image = this.getImage(relPath);
        return await image.resizeAndGetPath(size);
    }

    private getImage(relPath: string): GalleryImage {
        let image = this.galleryImageCache[relPath];
        if (!image) {
            image = new GalleryImage(this.paths, relPath);
            this.galleryImageCache[relPath] = image;
        }
        return image;
    }

    private async getJpegFileNames(inDir: string): Promise<string[]> {
        const dir = await fs.promises.readdir(inDir);
        return dir.filter((file) => file.endsWith('.jpg'));
    }
}
