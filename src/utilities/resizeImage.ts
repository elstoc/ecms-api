import gm from 'gm';

export const resizeImage = (inPath: string, outPath: string, height = 400): void => {
    gm(inPath).resize(1000000, height).quality(20).write(outPath, (err) => {
        if (err) throw (err);
    });
};
