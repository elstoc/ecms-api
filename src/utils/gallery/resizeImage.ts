import gm from 'gm';

export const resizeImage = (sourceImage: Buffer, width: number, height: number, quality: number): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        gm(sourceImage)
            .resize(width, height)
            .strip()
            .quality(quality)
            .borderColor('rgb(32,32,32)')
            .border(2, 2)
            .toBuffer('JPG', (err, buffer) => {
                if (err) reject('Image resize failed: ' + err.message);
                else resolve(buffer);
            });
    });
};
