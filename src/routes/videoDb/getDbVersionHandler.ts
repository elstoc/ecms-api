import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import winston from 'winston';

export const createGetDbVersionHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res, next) => {
    const { path } = req.query;
    try {
        const videoDb = await site.getVideoDb(path as string);
        const version = await videoDb.getVersion();
        res.json({ version });
    } catch (err: unknown) {
        next?.(err);
    }
};
