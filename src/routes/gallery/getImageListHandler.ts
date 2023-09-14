import winston from 'winston';
import { RequestHandler } from '../RequestHandler';
import { handleError } from '../handleError';
import { ISite } from '../../services';

export const createGetImageListHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res) => {
    const { path } = req.params;
    try {
        const limit = parseInt(req.query.limit?.toString() ?? '0');
        logger.debug(`getting image list ${path} (${limit})`);
        const images = await site.getGalleryImages(path, limit);
        res.json(images);
    } catch (err: unknown) {
        if (err instanceof Error) {
            logger.error(`Error getting image list ${path}: ${err.message}`);
        }
        handleError(req, res, err, logger);
    }
};
