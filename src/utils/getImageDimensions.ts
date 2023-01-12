import { promisify } from 'util';
import sizeOfSync from 'image-size';
import { Dimensions } from '../services/IGalleryImage';

const sizeOf = promisify(sizeOfSync);

export const getImageDimensions = async (fullPath: string): Promise<Dimensions> => {
    const size = await sizeOf(fullPath);
    return { width: size?.width, height: size?.height };
};
