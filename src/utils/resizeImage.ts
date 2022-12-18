import gm from 'gm';

const resizeImage = (inPath: string, outPath: string, width: number, height: number, quality: number): Promise<void> => {
    return new Promise((resolve, reject) => {
        gm(inPath)
            .resize(width, height)
            .strip()
            .quality(quality)
            .borderColor('rgb(32,32,32)')
            .border(2, 2)
            .write(outPath, (err) => {
                if (err) reject('Image resize failed: ' + err.message);
                else resolve();
            });
    });
};

export default resizeImage;
