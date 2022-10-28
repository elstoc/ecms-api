import gm from 'gm';

const im = gm.subClass({ imageMagick: true });

export const resizeImage = (inPath: string, outPath: string, height = 400): void => {
    im(inPath)
        .resize(1000000, height)
        .strip()
        .quality(50).write(outPath, (err) => {
            if (err) throw (err);
        });
};
