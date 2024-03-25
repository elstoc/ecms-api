import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import winston from 'winston';
import { NotFoundError } from '../../errors';

export const createGetDbVersionHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res, next) => {
    const { path } = req.query;
    try {
        if (!path || typeof path !== 'string') {
            throw new NotFoundError('incorrect route parameters');
        }
        const videoDb = await site.getVideoDb(path);
        const version = await videoDb.getVersion();
        res.json({ version });
    } catch (err: unknown) {
        next?.(err);
    }
};
