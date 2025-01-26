import sizeOf from 'image-size';
import { Dimensions } from '..';

export const getImageDimensions = (file: Buffer): Dimensions => {
    const size = sizeOf(file);
    return { width: size?.width, height: size?.height };
};
