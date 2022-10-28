import fs from 'fs';
import { getImageDimensions } from './getImageDimensions';

export type Image = {
    fileName: string;
    width: number;
    height: number;
};

export const listImages = async (path: string): Promise<Image[]> => {
    const files = await fs.promises.readdir(path);

    if (!fs.existsSync(path)) {
        return [];
    }

    const images: Image[] = [];

    for (const fileName of files) {
        if (fileName.endsWith('.jpg')) {
            const { width, height } = getImageDimensions(path + '/' + fileName);
            if (width && height) {
                images.push({ fileName, width, height });
            }
        }
    }

    return images;
};
