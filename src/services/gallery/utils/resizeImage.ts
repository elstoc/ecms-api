import gm from 'gm';
import { ImageSize } from '../../../contract/gallery.contract';

type ResizeConfig = {
    desc: ImageSize;
    width: number;
    height: number;
    quality: number;
    stripExif: boolean;
    addBorder: boolean;
    version?: number;
};

export const resizeImage = (sourceImage: Buffer, config: ResizeConfig): Promise<Buffer> => {
    const { width, height, quality, stripExif, addBorder } = config;
    return new Promise((resolve, reject) => {
        let resizedImage = gm(sourceImage)
            .resize(width, height)
            .quality(quality);
        
        if (addBorder) resizedImage = resizedImage.borderColor('rgb(60,60,60)').border(2, 2);
        if (stripExif) resizedImage = resizedImage.strip();

        return resizedImage.toBuffer(
            'JPG',
            (err, buffer) => {
                if (err) reject(new Error('Image resize failed: ' + err.message));
                else resolve(buffer);
            }
        );
    });
};
