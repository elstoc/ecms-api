import fs from 'fs';
import path from 'path';
import sizeOfSync from 'image-size';
import ExifReader from 'exifreader';
import gm from 'gm';
import { Dimensions, Exif, IGallery, GalleryData, SizeDesc } from './IGallery';
import { Config } from '../utils';
import { promisify } from 'util';

const im = gm.subClass({ imageMagick: true });
const sizeOf = promisify(sizeOfSync);

export class Gallery implements IGallery {
    private contentDir: string;
    private cacheDir: string;

    public constructor (config: Config) {
        this.contentDir = config.contentDir;
        this.cacheDir = config.cacheDir;
    }

    /* return an array of image data for the given gallery */
    public async getGalleryData(relPath: string, limit = 0): Promise<GalleryData> {
        const galleryDir = path.resolve(`${this.contentDir}/${relPath}`);

        if (!fs.existsSync(galleryDir)) {
            throw new Error('directory does not exist');
        }

        const imageListUnsorted = await this.getImageList(galleryDir);
        let imageList = imageListUnsorted.sort().reverse();
        if (limit > 0) imageList = imageList.slice(0, limit);
        const imageRelPathList = imageList.map((image) => `${relPath}/${image}`);
        const imageListOrig = await this.getGalleryImagePathList(imageRelPathList);
        const [imageListThumb, imageListExif] = await Promise.all([
            this.getResizedImagePathList(imageRelPathList, 'thumb'),
            this.getExifList(imageListOrig)
        ]);
        const imageListThumbDimensions = await this.getDimensionsList(imageListThumb);

        return {
            imageCount: imageListUnsorted.length,
            imageList: imageList.map((fileName, index) => {
                return {
                    fileName,
                    exif: imageListExif[index],
                    thumbDimensions: imageListThumbDimensions[index]
                };
            })
        };
    }

    private getGalleryImagePathList(relPaths: string[]): Promise<string[]> {
        return Promise.all(relPaths.map((relPath) => this.getGalleryImagePath(relPath)));
    }

    private getGalleryImagePath(relPath: string): string {
        return path.resolve(`${this.contentDir}/${relPath}`);
    }

    public getResizedImagePathList(relPaths: string[], sizeDesc: SizeDesc): Promise<string[]> {
        return Promise.all(relPaths.map((relPath) => this.getResizedImagePath(relPath, sizeDesc)));
    }

    public async getResizedImagePath(relPath: string, sizeDesc: SizeDesc): Promise<string> {
        if (!['full', 'thumb'].includes(sizeDesc)) throw new Error('incorrect size description');

        const quality = sizeDesc === 'thumb' ? 60 : 95;
        const width = sizeDesc === 'thumb' ? 100000 : 1920;
        const height = sizeDesc === 'thumb' ? 350 : 1080;

        const galleryPath = this.getGalleryImagePath(relPath);
        const [dirName, baseName] = [path.dirname(relPath), path.basename(relPath)];
        const thumbPath = path.resolve(`${this.cacheDir}/${dirName}/${sizeDesc}/${baseName}`);

        if (!fs.existsSync(galleryPath)) {
            throw new Error('file not found');
        }

        if (!fs.existsSync(thumbPath)) {
            await this.resizeImage(galleryPath, thumbPath, width, height, quality);
        }

        return thumbPath;
    }

    private getExifList(fullPaths: string[]): Promise<Exif[]> {
        return Promise.all(fullPaths.map((fullPath) => this.getExif(fullPath)));
    }

    /* Return selected Exif data from the given file */
    private async getExif (fullPath: string): Promise<Exif> {

        const tags = await ExifReader.load(fullPath, { expanded: true });
        const exifDateTaken = tags.exif?.DateTimeOriginal?.description;

        let dateTaken;
        if (exifDateTaken) {
            const a = exifDateTaken.split(/:| /).map((el: string) => parseInt(el));
            dateTaken = new Date(a[0], a[1] - 1, a[2], a[3], a[4], a[5]);
        }

        return {
            title: tags.xmp?.title?.description,
            dateTaken,
            camera: tags.exif?.Model?.description,
            lens: tags.exif?.LensModel?.description,
            exposure: tags.exif?.ExposureTime?.description,
            iso: tags.exif?.ISOSpeedRatings?.description?.toString(),
            aperture: tags.exif?.FNumber?.description,
            focalLength: tags.exif?.FocalLength?.description,
        };

    }

    private getDimensionsList(fullPaths: string[]): Promise<Dimensions[]> {
        return Promise.all(fullPaths.map((fullPath) => this.getDimensions(fullPath)));
    }

    /* Return the dimensions of the given file */
    private async getDimensions (fullPath: string): Promise<Dimensions> {
        const size = await sizeOf(fullPath);
        return { width: size?.width, height: size?.height };
    }

    /* Create a resized version of the given image, and save it to the given path */
    private resizeImage (inPath: string, outPath: string, width: number, height: number, quality: number ): Promise<void> {
        const outDir = path.dirname(outPath);
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }
        return new Promise((resolve, reject) => {
            im(inPath)
                .resize(width, height)
                .strip()
                .quality(quality)
                .borderColor('rgb(32,32,32)')
                .border(2, 2)
                .write(outPath, (err) => {
                    if (err) reject(new Error('Image resize failed'));
                    else resolve();
                });
        });
    }

    /* Get a list of jpg images in the given directory */
    private async getImageList(inDir: string): Promise<string[]> {
        const dir = await fs.promises.readdir(inDir);
        return dir.filter((file) => file.endsWith('.jpg'));
    }

    /* Get list of jpegs and their last modified times for a given directory */
    private async getImageStats(inDir: string): Promise<{ [key: string]: number }> {
        const output: { [key: string]: number} = {};
        const imageList = await this.getImageList(inDir);

        for(const fileName of imageList) {
            const stats = await fs.promises.stat(fileName);
            output[fileName] = stats.mtimeMs;
        }

        return output;
    }

}
