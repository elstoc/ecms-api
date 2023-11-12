import gm from 'gm';
import { ImageSize } from '../../services';

export type ResizeConfig = {
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
        
        if (addBorder) resizedImage = resizedImage.borderColor('rgb(32,32,32)').border(2, 2);
        if (stripExif) resizedImage = resizedImage.strip();

        return resizedImage.toBuffer(
            'JPG',
            (err, buffer) => {
                if (err) reject('Image resize failed: ' + err.message);
                else resolve(buffer);
            }
        );
    });
};
