import fs from 'fs';

export const pathIsDirectory = (path: string): boolean => {
    return fs.existsSync(path) && fs.statSync(path).isDirectory();
};

export const pathIsFile = (path: string): boolean => {
    return fs.existsSync(path) && !fs.statSync(path).isDirectory();
};

export const pathModifiedTime = (path: string): number => {
    return fs.existsSync(path)
        ? fs.statSync(path).mtimeMs
        : 0;
};
