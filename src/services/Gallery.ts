import fs from 'fs';
import path from 'path';
import sizeOfSync from 'image-size';
import { Dimensions, IGallery, GalleryData, SizeDesc, ImageData } from './IGallery';
import { Config } from '../utils';
import { promisify } from 'util';
import { SitePaths } from './SitePaths';
import { getExif } from '../utils/getExif';
import resizeImage from '../utils/resizeImage';

const sizeOf = promisify(sizeOfSync);

export class Gallery implements IGallery {
    private sitePaths: SitePaths;

    public constructor (config: Config) {
        this.sitePaths = new SitePaths(config);
    }

    public async getGalleryMetadata(relPath: string, limit = 0): Promise<GalleryData> {
        const galleryDir = this.sitePaths.getContentPath(relPath);

        if (!fs.existsSync(galleryDir)) {
            throw new Error('directory does not exist');
        }

        let imageFileNames = (await this.getImageFileNames(galleryDir)).sort().reverse();
        const imageCount = imageFileNames.length;

        if (limit > 0) imageFileNames = imageFileNames.slice(0, limit);

        const imageList = await Promise.all(imageFileNames.map((fileName) => this.getImageMetadata(relPath, fileName)));

        return { imageCount, imageList };
    }

    private async getImageMetadata(galleryRelPath: string, fileName: string): Promise<ImageData> {
        const imageRelPath = `${galleryRelPath}/${fileName}`;
        const origFilePath = this.sitePaths.getContentPath(imageRelPath);
        const [thumbPath, exif] = await Promise.all([
            this.resizeImageAndGetPath(imageRelPath, 'thumb'),
            getExif(origFilePath)
        ]);
        const thumbDimensions = await this.getDimensions(thumbPath);
        return { fileName, exif, thumbDimensions };
    }

    public async resizeImageAndGetPath(relPath: string, sizeDesc: SizeDesc): Promise<string> {
        if (!['full', 'thumb'].includes(sizeDesc)) throw new Error('incorrect size description');

        const quality = sizeDesc === 'thumb' ? 60 : 95;
        const width = sizeDesc === 'thumb' ? 100000 : 1920;
        const height = sizeDesc === 'thumb' ? 350 : 1080;

        const galleryPath = this.sitePaths.getContentPath(relPath);
        const [dirName, baseName] = [path.dirname(relPath), path.basename(relPath)];
        const thumbPath = this.sitePaths.getCachePath(dirName, sizeDesc, baseName);

        if (!fs.existsSync(galleryPath)) {
            throw new Error('file not found');
        }

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

    /* Get a list of jpg images in the given directory */
    private async getImageFileNames(inDir: string): Promise<string[]> {
        const dir = await fs.promises.readdir(inDir);
        return dir.filter((file) => file.endsWith('.jpg'));
    }
}
