import sizeOf from 'image-size';

export type ImageDimensions = {
    width: number | undefined;
    height: number | undefined;
}

export const getImageDimensions = (path: string): ImageDimensions => {
    const { width, height } = sizeOf(path);
    return { width, height };
};
