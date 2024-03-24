import winston from 'winston';
import { RequestHandler } from '../RequestHandler';
import { handleError } from '../handleError';
import { ISite } from '../../services';
import { NotFoundError } from '../../errors';

export const createGetGalleryContentsHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res) => {
    const { path, limit } = req.query;
    try {
        if (!path || typeof path !== 'string') {
            throw new NotFoundError('incorrect route parameters');
        }
        const limitInt = parseInt(limit?.toString() ?? '0');
        logger.debug(`getting image list ${path} (${limit})`);
        const gallery = await site.getGallery(path);
        const images = await gallery.getContents(limitInt);
        res.json(images);
    } catch (err: unknown) {
        if (err instanceof Error) {
            logger.error(`Error getting image list ${path}: ${err.message}`);
        }
        handleError(req, res, err, logger);
    }
};
