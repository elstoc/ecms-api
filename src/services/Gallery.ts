import fs from 'fs';

import { GalleryData } from './IGallery';
import { GalleryImage } from './GalleryImage';
import { SitePaths } from './SitePaths';

export class Gallery {
    public constructor(private paths: SitePaths, private galleryImage: GalleryImage) {}

    public async getMetadata(relPath: string, limit = 0): Promise<GalleryData> {
        const galleryDir = this.paths.getContentPathIfExists(relPath);

        let imageFileNames = (await this.getImageFileNames(galleryDir)).sort().reverse();
        const imageCount = imageFileNames.length;

        if (limit > 0) imageFileNames = imageFileNames.slice(0, limit);

        const imageList = await Promise.all(imageFileNames.map((fileName) => this.galleryImage.getMetadata(relPath, fileName)));

        return { imageCount, imageList };
    }

    /* Get a list of jpg images in the given directory */
    private async getImageFileNames(inDir: string): Promise<string[]> {
        const dir = await fs.promises.readdir(inDir);
        return dir.filter((file) => file.endsWith('.jpg'));
    }
}
