import fs from 'fs';
import sizeOf from 'image-size';
import ExifReader from 'exifreader';
import gm from 'gm';
import { Dimensions, Exif, IGallery, Image } from './IGallery';
import { Config } from './config';

const im = gm.subClass({ imageMagick: true });

export class Gallery implements IGallery {
    private contentDir: string;
    private cacheDir: string;

    public constructor (config: Config) {
        this.contentDir = config.contentDir;
        this.cacheDir = config.cacheDir;
    }

    private parseExifDate (date: string | undefined): Date | undefined {
        if (date) {
            const a = date.split(/:| /).map((el: string) => parseInt(el));
            return new Date(a[0], a[1] - 1, a[2], a[3], a[4], a[5]);
        }
    }

    private async getExif (fullPath: string): Promise<Exif> {
        const tags = await ExifReader.load(fullPath, { expanded: true });
        return {
            title: tags.xmp?.title?.description,
            dateTaken: this.parseExifDate(tags.exif?.DateTimeOriginal?.description),
            camera: tags.exif?.Model?.description,
            lens: tags.exif?.LensModel?.description,
            exposure: tags.exif?.ExposureTime?.description,
            iso: tags.exif?.ISOSpeedRatings?.description?.toString(),
            aperture: tags.exif?.FNumber?.description,
            focalLength: tags.exif?.FocalLength?.description,
        };
    }

    private getDimensions (fullPath: string): Dimensions {
        const { width, height } = sizeOf(fullPath);
        return { width, height };
    }

    private resizeImage (inPath: string, outPath: string, height = 400): void {
        im(inPath)
            .resize(1000000, height)
            .strip()
            .quality(50).write(outPath, (err) => {
                if (err) throw (err);
            });
    }

    private async resizeDir (inDir: string, outDir: string, height: number): Promise<void> {
        const files = await fs.promises.readdir(inDir);

        if (!fs.existsSync(outDir)) {
            await fs.promises.mkdir(outDir, { recursive: true });
        }

        for (const filename of files) {
            if (filename.endsWith('.jpg')) {
                this.resizeImage(inDir + '/' + filename, outDir + '/' + filename, height);
            }
        }
    }

    public async listDir (fullPath: string): Promise<Image[]> {
        const files = await fs.promises.readdir(fullPath);

        if (!fs.existsSync(fullPath)) {
            return [];
        }

        const images: Image[] = [];

        for (const fileName of files) {
            if (fileName.endsWith('.jpg')) {
                const { width, height } = this.getDimensions(fullPath + '/' + fileName);
                if (width && height) {
                    images.push({ fileName, width, height });
                }
            }
        }

        return images;
    }
}
