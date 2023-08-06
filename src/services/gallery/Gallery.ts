import { IGallery, GalleryImages } from './IGallery';
import { GalleryImage } from './GalleryImage';
import { ImageData, ImageSize } from './IGalleryImage';
import { Config } from '../../utils';
import { Response } from 'express';
import { IStorageAdapter } from '../../adapters/IStorageAdapter';

export class Gallery implements IGallery {
    private apiPath: string;
    private imageCache: { [key: string]: GalleryImage } = {};

    public constructor(
        apiPath: string,
        private config: Config,
        private storage: IStorageAdapter
    ) {
        this.apiPath = apiPath.replace(/^\//, '');
    }

    public async getImages(limit?: number): Promise<GalleryImages> {
        const imageFileNames = (await this.getJpegFileNames()).sort().reverse();
        const imageCount = imageFileNames.length;

        const images = await Promise.all(
            imageFileNames
                .slice(0, limit)
                .map((fileName) => this.getImageMetadata(`${this.apiPath}/${fileName}`))
        );

        return { imageCount, images };
    }

    private async getImageMetadata(apiPath: string): Promise<ImageData> {
        const image = this.getGalleryImage(apiPath);
        return await image.getImageData();
    }

    public async sendImageFile(apiPath: string, size: ImageSize, response: Response): Promise<void> {
        const image = this.getGalleryImage(apiPath);
        await image.sendFile(size, response);
    }

    private getGalleryImage(apiPath: string): GalleryImage {
        let image = this.imageCache[apiPath];
        if (!image) {
            image = new GalleryImage(this.config, apiPath, this.storage);
            this.imageCache[apiPath] = image;
        }
        return image;
    }

    private async getJpegFileNames(): Promise<string[]> {
        return this.storage.listContentChildren(this.apiPath, (file) => file.endsWith('jpg'));
    }
}
