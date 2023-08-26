import { basename } from 'path';

import { IGalleryImage, ImageData, ImageSize } from './IGalleryImage';
import { getExif, resizeImage, getImageDimensions, Config } from '../../utils';
import { IStorageAdapter } from '../../adapters/IStorageAdapter';
import { NotFoundError } from '../../errors';

const RESIZE_OPTIONS = {
    thumb: { width: 100000, height: 350, quality: 60, stripExif: true, addBorder: true },
    fhd: { width: 2130, height: 1200, quality: 95, stripExif: true, addBorder: false },
    forExif: { width: 1, height: 1, quality: 0, stripExif: false, addBorder: false }
};

export class GalleryImage implements IGalleryImage {
    private imageDataFromSourceFileTime = -1;

    private imageData?: ImageData;

    public constructor(
        private config: Config,
        private contentPath: string,
        private storage: IStorageAdapter
    ) { }
    
    public async getImageData(): Promise<ImageData> {
        this.throwIfNoSourceFile();

        const sourceModifiedTime = this.storage.getContentFileModifiedTime(this.contentPath);

        if (this.imageData && sourceModifiedTime <= this.imageDataFromSourceFileTime) {
            return this.imageData;
        }
        
        const [thumbFileBuf, exifFileBuf] = await Promise.all([
            this.getResizedImageBuf('thumb'),
            this.getResizedImageBuf('forExif')
        ]);

        const exif = getExif(exifFileBuf);

        let description = exif.title ?? '';
        if (exif.dateTaken) {
            const exifDate = new Date(exif.dateTaken);
            description += ` (${exifDate.toLocaleDateString('default', { month: 'short' })} ${exifDate.getFullYear()})`;
        }

        this.imageDataFromSourceFileTime = sourceModifiedTime;

        this.imageData =  {
            fileName: basename(this.contentPath),
            description,
            exif,
            thumbDimensions: getImageDimensions(thumbFileBuf),
            thumbSrcUrl: this.getSourceUrl('thumb'),
            fhdSrcUrl: this.getSourceUrl('fhd')
        };

        return this.imageData;
    }

    private throwIfNoSourceFile(): void {
        if (!this.storage.contentFileExists(this.contentPath)) {
            throw new NotFoundError(`Source file ${this.contentPath} does not exist`);
        }
    }

    private getSourceUrl(size: ImageSize) {
        return `${this.config.url}/gallery/image/${this.contentPath}?id=${this.imageDataFromSourceFileTime}&size=${size}`;
    }

    public async getFile(size: ImageSize): Promise<Buffer> {
        if (!['fhd', 'thumb'].includes(size)) {
            throw new NotFoundError('Incorrect size description');
        }
        this.throwIfNoSourceFile();

        return this.getResizedImageBuf(size);
    }

    private async getResizedImageBuf(size: ImageSize): Promise<Buffer> {
        if (this.storage.generatedFileIsOlder(this.contentPath, size)) {
            return this.generateResizedImage(size);
        }
        return this.storage.getGeneratedFile(this.contentPath, size);
    }

    private async generateResizedImage(size: ImageSize): Promise<Buffer> {
        const sourceFileBuf = await this.storage.getContentFile(this.contentPath);
        const targetFileBuf = await resizeImage(sourceFileBuf, RESIZE_OPTIONS[size]);
        await this.storage.storeGeneratedFile(this.contentPath, size, targetFileBuf);
        return targetFileBuf;
    }
}
