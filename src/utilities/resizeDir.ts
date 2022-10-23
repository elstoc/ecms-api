import fs from 'fs';
import { resizeImage } from './resizeImage';

export const resizeDirs = async (inDir: string, outDir: string, height: number): Promise<void> => {
    const files = await fs.promises.readdir(inDir);

    if (!fs.existsSync(outDir)) {
        await fs.promises.mkdir(outDir, { recursive: true });
    }

    for (const filename of files) {
        if (filename.endsWith('.jpg')) {
            resizeImage(inDir + '/' + filename, outDir + '/' + filename, height);
        }
    }
};
