import { basename } from 'path';

import { IGalleryImage, ImageMetadata, ImageSize } from './IGalleryImage';
import { getExif, resizeImage, getImageDimensions, Config } from '../../utils';
import { IStorageAdapter } from '../../adapters/IStorageAdapter';
import { NotFoundError, NotPermittedError } from '../../errors';

export const RESIZE_OPTIONS = {
    thumb: { version: 1, desc: ImageSize.thumb, width: 100000, height: 300, quality: 60, stripExif: true, addBorder: true },
    fhd: { version: 1, desc: ImageSize.fhd, width: 2400, height: 1350, quality: 90, stripExif: true, addBorder: false },
    forExif: { version: 1, desc: ImageSize.forExif, width: 1, height: 1, quality: 0, stripExif: false, addBorder: false }
};

export class GalleryImage implements IGalleryImage {
    private imageDataFromSourceFileTime = -1;

    private imageMetadata?: ImageMetadata;

    public constructor(
        private config: Config,
        private contentPath: string,
        private storage: IStorageAdapter
    ) { }
    
    public async getImageMetadata(): Promise<ImageMetadata> {
        this.throwIfNoSourceFile();

        const sourceModifiedTime = this.getSourceModifiedTime();

        if (this.imageMetadata && sourceModifiedTime <= this.imageDataFromSourceFileTime) {
            return this.imageMetadata;
        }
        
        const [thumbFileBuf, exifFileBuf] = await Promise.all([
            this.getResizedImageBuf(ImageSize.thumb),
            this.getResizedImageBuf(ImageSize.forExif)
        ]);

        const exif = getExif(exifFileBuf);

        let description = exif.title ?? '';
        if (exif.dateTaken) {
            const exifDate = new Date(exif.dateTaken);
            description += ` (${exifDate.toLocaleDateString('default', { month: 'short' })} ${exifDate.getFullYear()})`;
        }

        this.imageDataFromSourceFileTime = sourceModifiedTime;

        this.imageMetadata =  {
            fileName: basename(this.contentPath),
            description,
            exif,
            thumbDimensions: getImageDimensions(thumbFileBuf),
            thumbSrcUrl: this.getSourceUrl(ImageSize.thumb),
            fhdSrcUrl: this.getSourceUrl(ImageSize.fhd)
        };

        return this.imageMetadata;
    }

    private getSourceModifiedTime(): number {
        return this.storage.getContentFileModifiedTime(this.contentPath);
    }

    private throwIfNoSourceFile(): void {
        if (!this.storage.contentFileExists(this.contentPath)) {
            throw new NotFoundError(`Source file ${this.contentPath} does not exist`);
        }
    }

    private getSourceUrl(size: ImageSize) {
        const config = RESIZE_OPTIONS[size];
        return `${this.config.apiUrl}/gallery/image/${this.contentPath}?timestamp=${this.imageDataFromSourceFileTime}&size=${config.desc}&version=${config.version}`;
    }

    public async getFile(size: ImageSize, timestamp: number): Promise<Buffer> {
        if (![ImageSize.fhd, ImageSize.thumb].includes(size)) {
            throw new NotFoundError('Incorrect size description');
        }
        this.throwIfNoSourceFile();
        if (timestamp !== this.getSourceModifiedTime()) {
            throw new NotPermittedError('incorrect timestamp given');
        }

        return this.getResizedImageBuf(size);
    }

    private async getResizedImageBuf(size: ImageSize): Promise<Buffer> {
        const config = RESIZE_OPTIONS[size];
        const tag = `${config.desc}_v${config.version}`;
        if (this.storage.generatedFileIsOlder(this.contentPath, tag)) {
            return this.generateResizedImage(size);
        }
        return this.storage.getGeneratedFile(this.contentPath, tag);
    }

    private async generateResizedImage(size: ImageSize): Promise<Buffer> {
        const sourceFileBuf = await this.storage.getContentFile(this.contentPath);
        const targetFileBuf = await resizeImage(sourceFileBuf, RESIZE_OPTIONS[size]);
        await this.storage.storeGeneratedFile(this.contentPath, size, targetFileBuf);
        return targetFileBuf;
    }
}
