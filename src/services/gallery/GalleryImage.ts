import fs from 'fs';
import path from 'path';

import { Dimensions, IGalleryImage, ImageData, ImageSize } from './IGalleryImage';
import { getExif, resizeImage, getImageDimensions, pathModifiedTime, Config } from '../../utils';
import { Response } from 'express';
import { IStorageAdapter } from '../../adapters/IStorageAdapter';

const RESIZE_OPTIONS = {
    thumb: { width: 100000, height: 350, quality: 60 },
    fhd:  { width: 2130, height: 1200, quality: 95 }
};

export class GalleryImage implements IGalleryImage {
    private sourceFileModifiedTimeForCache = 0;
    private thumbDimensions?: Dimensions;
    private exif?: { [key: string]: string | undefined };
    private description?: string;
    private thumbSrcUrl?: string;
    private fhdSrcUrl?: string;

    public constructor(
        private config: Config,
        private uiPath: string,
        private storage: IStorageAdapter
    ) {
        this.clearCacheIfOutdated();
    }
    
    private clearCacheIfOutdated(): void {
        const sourceFileModifiedTime = this.getFileModifiedTime('source');
        if (sourceFileModifiedTime === 0) {
            throw new Error(`File ${this.getFullPath('source')} does not exist`);
        } else if (sourceFileModifiedTime !== this.sourceFileModifiedTimeForCache) {
            this.exif = undefined;
            this.description = undefined;
            this.thumbDimensions = undefined;
            this.sourceFileModifiedTimeForCache = sourceFileModifiedTime;
            this.thumbSrcUrl = undefined;
            this.fhdSrcUrl = undefined;
        }
    }

    private getFileModifiedTime(size: string): number {
        return pathModifiedTime(this.getFullPath(size));
    }

    private getFullPath(size: string): string {
        if (size === 'source') {
            return path.join(this.config.dataDir, 'content', this.uiPath);
        }
        const [dirName, baseName] = [path.dirname(this.uiPath), path.basename(this.uiPath)];
        return path.join(this.config.dataDir, 'cache', dirName, size, baseName);
    }

    public async getMetadata(): Promise<ImageData> {
        this.clearCacheIfOutdated();
        await Promise.all([
            this.refreshThumbDimensions(),
            this.refreshExif()
        ]);

        if (!this.exif || !this.thumbDimensions) {
            throw new Error('Metadata unavailable');
        }

        return {
            fileName: path.basename(this.uiPath),
            description: this.description,
            exif: this.exif,
            thumbDimensions: this.thumbDimensions,
            thumbSrcUrl: this.thumbSrcUrl,
            fhdSrcUrl: this.fhdSrcUrl
        };
    }

    private async refreshThumbDimensions(): Promise<void> {
        if (!this.thumbDimensions) {
            await this.resizeStaleImage('thumb');
            this.thumbDimensions = await getImageDimensions(this.getFullPath('thumb'));
        }
    }

    private async refreshExif(): Promise<void> {
        if (!this.exif) {
            const file = await fs.promises.readFile(this.getFullPath('source'));
            this.exif = getExif(file);
            this.description = this.exif.title ?? '';

            if (this.exif.dateTaken) {
                const exifDate = new Date(this.exif.dateTaken);
                this.description += ` (${exifDate.toLocaleDateString('default', { month: 'short' })} ${exifDate.getFullYear()})`;
            }
            this.thumbSrcUrl = `${this.config.url}/gallery/image/${this.uiPath}?id=${this.sourceFileModifiedTimeForCache}&size=thumb`;
            this.fhdSrcUrl = `${this.config.url}/gallery/image/${this.uiPath}?id=${this.sourceFileModifiedTimeForCache}&size=fhd`;
        }
    }

    public async sendFile(size: ImageSize, response: Response): Promise<void> {
        if (!['fhd', 'thumb'].includes(size)) {
            throw new Error('Incorrect size description');
        }
        this.clearCacheIfOutdated();
        await this.resizeStaleImage(size);
        const path =  this.getFullPath(size);
        response.sendFile(path);
    }

    private async resizeStaleImage(size: ImageSize): Promise<void> {
        if (this.cacheFileStale(size)) {
            await this.resizeImage(size);
        }
    }

    private cacheFileStale(size: string): boolean {
        return this.getFileModifiedTime(size) < this.sourceFileModifiedTimeForCache;
    }

    private async resizeImage(size: ImageSize) {
        const targetDir = path.dirname(this.getFullPath(size));
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        const { quality, width, height } = RESIZE_OPTIONS[size];
        const sourceFile = await fs.promises.readFile(this.getFullPath('source'));
        const targetFile = await resizeImage(sourceFile, width, height, quality);
        await fs.promises.writeFile(this.getFullPath(size), targetFile);
        if (size === 'thumb') {
            this.thumbDimensions = undefined;
        }
    }
}
