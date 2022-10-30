import fs from 'fs';
import path from 'path';
import sizeOf from 'image-size';
import ExifReader from 'exifreader';
import gm from 'gm';
import { Dimensions, Exif, IGallery, ImageData } from './IGallery';
import { Config } from '../utils/config';

const im = gm.subClass({ imageMagick: true });

export class Gallery implements IGallery {
    private contentDir: string;
    private cacheDir: string;

    public constructor (config: Config) {
        this.contentDir = `${config.contentDir}/gallery/`;
        this.cacheDir = `${config.cacheDir}/gallery/`;
    }

    /* return an array of image data for the given gallery */
    public async getGalleryData(relPath: string): Promise<ImageData[]> {

        const galleryDir = path.resolve(`${this.contentDir}/${relPath}`);

        if (!fs.existsSync(galleryDir)) {
            console.log(galleryDir);
            throw new Error('directory does not exist');
        }

        const galleryData: ImageData[] = [];

        const imageList = this.getImageList(galleryDir).sort();

        for(const image of imageList) {
            const origFile = this.getGalleryImagePath(`${relPath}/${image}`);
            const thumbFile = await this.getResizedImagePath(`${relPath}/${image}`);
            const exif = await this.getExif(origFile);
            galleryData.push({
                fileName: image,
                exif,
                thumbDimensions: this.getDimensions(thumbFile)
            });
        }

        return galleryData;
    }

    private getGalleryImagePath(relPath: string): string {
        return path.resolve(`${this.contentDir}/${relPath}`);
    }

    public async getResizedImagePath(relPath: string): Promise<string> {
        const galleryPath = this.getGalleryImagePath(relPath);
        const thumbPath = path.resolve(`${this.cacheDir}/${path.dirname(relPath)}/thumbs/${path.basename(relPath)}`);
        if (fs.existsSync(galleryPath)) {
            if (!fs.existsSync(thumbPath)) {
                await this.resizeImage(galleryPath, thumbPath);
            }
            return thumbPath;
        } else {
            throw new Error('file not found');
        }
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

    /* Return the dimensions of the given file */
    private getDimensions (fullPath: string): Dimensions {
        const { width, height } = sizeOf(fullPath);
        return { width, height };
    }

    /* Create a resized version of the given image, and save it to the given path */
    private resizeImage (inPath: string, outPath: string, height = 350): Promise<void> {
        return new Promise((resolve, reject) => {
            im(inPath)
                .resize(1000000, height)
                .strip()
                .quality(50).write(outPath, (err) => {
                    if (err) reject(new Error('Image resize failed'));
                    else resolve();
                });
        });
    }

    /* Get a list of jpg images in the given directory */
    private getImageList(inDir: string): string[] {
        return fs.readdirSync(inDir)
            .filter((file) => file.endsWith('.jpg'));
    }

    /* Get list of jpegs and their last modified times for a given directory */
    private getImageStats(inDir: string): { [key: string]: number } {
        const output: { [key: string]: number} = {};

        this.getImageList(inDir).forEach((fileName) => {
            output[fileName] = fs.statSync(fileName).mtimeMs;
        });

        return output;
    }

}
