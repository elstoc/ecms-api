import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import sizeOfSync from 'image-size';

import { Dimensions, ImageData } from './IGallery';
import { getExif } from '../utils/getExif';
import { resizeImage } from '../utils/resizeImage';

import { SitePaths } from './SitePaths';

const sizeOf = promisify(sizeOfSync);

export class GalleryImage {
    public constructor(private paths: SitePaths) {}

    public async getMetadata(galleryRelPath: string, fileName: string): Promise<ImageData> {
        const imageRelPath = `${galleryRelPath}/${fileName}`;
        const origFilePath = this.paths.getContentPath(imageRelPath);
        const [thumbPath, exif] = await Promise.all([
            this.resizeAndGetPath(imageRelPath, 'thumb'),
            getExif(origFilePath)
        ]);
        const thumbDimensions = await this.getDimensions(thumbPath);
        return { fileName, exif, thumbDimensions };
    }

    public async resizeAndGetPath(relPath: string, sizeDesc: 'thumb' | 'full'): Promise<string> {
        if (!['full', 'thumb'].includes(sizeDesc)) throw new Error('incorrect size description');

        const quality = sizeDesc === 'thumb' ? 60 : 95;
        const width = sizeDesc === 'thumb' ? 100000 : 1920;
        const height = sizeDesc === 'thumb' ? 350 : 1080;

        const galleryPath = this.paths.getContentPathIfExists(relPath);
        const [dirName, baseName] = [path.dirname(relPath), path.basename(relPath)];
        const thumbPath = this.paths.getCachePath(dirName, sizeDesc, baseName);

        if (!fs.existsSync(thumbPath)) {
            await resizeImage(galleryPath, thumbPath, width, height, quality);
        }

        return thumbPath;
    }

    /* Return the dimensions of the given file */
    private async getDimensions (fullPath: string): Promise<Dimensions> {
        const size = await sizeOf(fullPath);
        return { width: size?.width, height: size?.height };
    }

}
