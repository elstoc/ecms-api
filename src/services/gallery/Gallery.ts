import { IGallery, GalleryContents } from './IGallery';
import { GalleryImage } from './GalleryImage';
import { ImageMetadata, ImageSize } from './IGalleryImage';
import { Config } from '../../utils';
import { IStorageAdapter } from '../../adapters/IStorageAdapter';
import { Logger } from 'winston';

export class Gallery implements IGallery {
    private apiPath: string;
    private imageCache: { [key: string]: GalleryImage } = {};

    public constructor(
        apiPath: string,
        private config: Config,
        private storage: IStorageAdapter,
        private logger: Logger
    ) {
        this.apiPath = apiPath.replace(/^\//, '');
    }

    public async getContents(limit?: number): Promise<GalleryContents> {
        this.logger.debug(`getting contents of ${this.apiPath} (limit ${limit})`);
        const allImageFiles = (await this.getJpegFileNames()).sort().reverse();

        const images = await Promise.all(
            allImageFiles
                .slice(0, limit)
                .map((fileName) => this.getImageMetadata(`${this.apiPath}/${fileName}`))
        );

        return { images, allImageFiles };
    }

    private async getImageMetadata(apiPath: string): Promise<ImageMetadata> {
        const image = this.getGalleryImage(apiPath);
        return await image.getImageMetadata();
    }

    public async getImageFile(apiPath: string, size: ImageSize, timestamp: string): Promise<Buffer> {
        const image = this.getGalleryImage(apiPath);
        return image.getFile(size, timestamp);
    }

    private getGalleryImage(apiPath: string): GalleryImage {
        let image = this.imageCache[apiPath];
        if (!image) {
            image = new GalleryImage(this.config, apiPath, this.storage, this.logger);
            this.imageCache[apiPath] = image;
        }
        return image;
    }

    private async getJpegFileNames(): Promise<string[]> {
        return this.storage.listContentChildren(this.apiPath, (file) => file.endsWith('jpg'));
    }
}
