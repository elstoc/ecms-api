import winston from 'winston';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';

export const createGetGalleryContentsHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res, next) => {
    const { path, limit } = req.query;
    try {
        const limitInt = limit ? parseInt(limit.toString()) : undefined;
        logger.debug(`getting image list ${path} (${limit})`);
        const gallery = await site.getGallery(path as string);
        const images = await gallery.getContents(limitInt);
        res.json(images);
    } catch (err: unknown) {
        if (err instanceof Error) {
            logger.error(`Error getting image list ${path}: ${err.message}`);
        }
        next?.(err);
    }
};
