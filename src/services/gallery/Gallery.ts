import path from 'path';
import fs from 'fs';

import { IGallery, GalleryData } from './IGallery';
import { GalleryImage } from './GalleryImage';
import { ImageData, ImageSize } from './IGalleryImage';
import { Config } from '../../utils';

export class Gallery implements IGallery {
    private apiPath: string;
    private config: Config;
    private imageCache: { [key: string]: GalleryImage } = {};

    public constructor(apiPath: string, config: Config) {
        this.apiPath = apiPath.replace(/^\//, '');
        this.config = config;
    }

    public async getMetadata(limit?: number): Promise<GalleryData> {
        const imageFileNames = (await this.getJpegFileNames()).sort().reverse();
        const imageCount = imageFileNames.length;

        const imageList = await Promise.all(
            imageFileNames
                .slice(0, limit)
                .map((fileName) => this.getImageMetadata(`${this.apiPath}/${fileName}`))
        );

        return { imageCount, imageList };
    }

    private async getImageMetadata(apiPath: string): Promise<ImageData> {
        const image = this.getGalleryImage(apiPath);
        return await image.getMetadata();
    }

    public async resizeImageAndGetPath(apiPath: string, size: ImageSize): Promise<string> {
        const image = this.getGalleryImage(apiPath);
        return await image.resizeAndGetPath(size);
    }

    private getGalleryImage(apiPath: string): GalleryImage {
        let image = this.imageCache[apiPath];
        if (!image) {
            image = new GalleryImage(this.config, apiPath);
            this.imageCache[apiPath] = image;
        }
        return image;
    }

    private async getJpegFileNames(): Promise<string[]> {
        const fullPath = path.join(this.config.contentDir, this.apiPath);
        const dir = await fs.promises.readdir(fullPath);
        return dir.filter((file) => file.endsWith('.jpg'));
    }
}
