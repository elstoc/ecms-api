import { RequestHandler } from '../RequestHandler';
import { ImageSize, ISite } from '../../services';
import winston from 'winston';

export const createGetImageFileHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res, next) => {
    const { path, size, timestamp } = req.query;
    try {
        const gallery = await site.getGallery(path as string);
        const imageFileBuf = await gallery.getImageFile(path as string, size as ImageSize, timestamp as string);
        res.send(imageFileBuf);
    } catch (err: unknown) {
        if (err instanceof Error) {
            logger.error(`Error getting image ${path} ${size}: ${err.message}`);
        }
        next?.(err);
    }
};
