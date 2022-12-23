import fs from 'fs';
import path from 'path';

import { Dimensions, ImageData } from './IGallery';
import { getExif } from '../utils/getExif';
import { resizeImage } from '../utils/resizeImage';
import { getImageDimensions } from '../utils/getImageDimensions';

import { SitePaths } from './SitePaths';

const RESIZE_OPTIONS = {
    thumb: { width: 100000, height: 350, quality: 60 },
    fhd:  { width: 1920, height: 1080, quality: 95 }
};

export type ImageSize = 'thumb' | 'fhd';

export class GalleryImage {
    private paths: SitePaths;
    private relPath: string;
    private sourceFileModifiedTimeForCache = 0;
    private thumbDimensions?: Dimensions;
    private exif?: { [key: string]: string | undefined };

    public constructor(paths: SitePaths, relPath: string) {
        this.paths = paths;
        this.relPath = relPath;
        this.checkSourceInvalidateCache();
    }
    
    private checkSourceInvalidateCache(): void {
        const sourceFileModifiedTime = this.getFileModifiedTime('source');
        if (sourceFileModifiedTime === 0) {
            throw new Error(`File ${this.getFullPath('source')} does not exist`);
        } else if (sourceFileModifiedTime !== this.sourceFileModifiedTimeForCache) {
            this.exif = undefined;
            this.thumbDimensions = undefined;
            this.sourceFileModifiedTimeForCache = sourceFileModifiedTime;
        }
    }

    private getFileModifiedTime(size: string): number {
        try {
            return fs.statSync(this.getFullPath(size)).atimeMs;
        } catch {
            return 0;
        }
    }

    private getFullPath(size: string): string {
        if (size === 'source') {
            return this.paths.getContentPath(this.relPath);
        }
        const [dirName, baseName] = [path.dirname(this.relPath), path.basename(this.relPath)];
        return this.paths.getCachePath(dirName, size, baseName);
    }

    public async getMetadata(): Promise<ImageData> {
        this.checkSourceInvalidateCache();
        await Promise.all([
            this.refreshThumbDimensions(),
            this.refreshExif()
        ]);

        if (!this.exif || !this.thumbDimensions) {
            throw new Error('Metadata unavailable');
        }

        return {
            fileName: path.basename(this.relPath),
            exif: this.exif,
            thumbDimensions: this.thumbDimensions
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
            this.exif = await getExif(this.getFullPath('source'));
        }
    }

    public async resizeAndGetPath(size: ImageSize): Promise<string> {
        if (!['fhd', 'thumb'].includes(size)) {
            throw new Error('Incorrect size description');
        }
        this.checkSourceInvalidateCache();
        await this.resizeStaleImage(size);
        return this.getFullPath(size);
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
        await resizeImage(this.getFullPath('source'), this.getFullPath(size), width, height, quality);
        if (size === 'thumb') {
            this.thumbDimensions = undefined;
        }
    }
}
