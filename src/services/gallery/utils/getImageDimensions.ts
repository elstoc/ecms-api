import sizeOf from 'image-size';
import { Dimensions } from '../../../contracts/gallery.contract';

export const getImageDimensions = (file: Buffer): Dimensions => {
    const size = sizeOf(file);
    return { width: size.width ?? 0, height: size.height ?? 0 };
};
