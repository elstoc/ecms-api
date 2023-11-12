import { RequestHandler } from '../RequestHandler';
import { ImageSize, ISite } from '../../services';
import winston from 'winston';
import { handleError } from '../handleError';
import { NotFoundError } from '../../errors';

export const createGetImageFileHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res) => {
    const { path } = req.params;
    const { size, timestamp } = req.query;
    try {
        if (!size || !timestamp || typeof size !== 'string' || typeof timestamp !== 'string') {
            throw new NotFoundError('incorrect route parameters');
        }
        const imageFileBuf = await site.getGalleryImageFile(path, size as ImageSize, timestamp);
        res.send(imageFileBuf);
    } catch (err: unknown) {
        if (err instanceof Error) {
            logger.error(`Error getting image ${path} ${size}: ${err.message}`);
        }
        handleError(req, res, err, logger);
    }
};
