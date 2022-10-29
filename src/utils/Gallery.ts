import fs from 'fs';
import sizeOf from 'image-size';
import ExifReader from 'exifreader';
import gm from 'gm';
import { Dimensions, Exif, IGallery, ImageData } from './IGallery';
import { Config } from './config';

const im = gm.subClass({ imageMagick: true });

export class Gallery implements IGallery {
    private contentDir: string;
    private cacheDir: string;

    public constructor (config: Config) {
        this.contentDir = config.contentDir;
        this.cacheDir = config.cacheDir;
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

    public async getGalleryData(): Promise<ImageData[]> {
        // get list of original images
        const galleryDir = '/home/chris/coding/javascript/home-api/content/gallery/portfolio/';
        const cacheDir = '/home/chris/coding/javascript/home-api/cache/gallery/portfolio/';
        const galleryData: ImageData[] = [];

        const imageList = this.getImageList(galleryDir).sort();

        for(const image of imageList) {
            const origFile = `${galleryDir}/${image}`;
            const thumbFile = `${cacheDir}/thumbs/${image}`;
            const exif = await this.getExif(origFile);
            if (!fs.existsSync(thumbFile)) {
                await this.resizeImage(origFile, thumbFile);
            }
            galleryData.push({
                fileName: image,
                exif,
                thumbDimensions: this.getDimensions(thumbFile)
            });
        }

        return galleryData;
    }

}
