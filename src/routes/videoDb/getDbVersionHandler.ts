import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import winston from 'winston';
import { handleError } from '../handleError';

export const createGetDbVersionHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res) => {
    const { path } = req.params;
    try {
        const videoDb = await site.getVideoDb(path);
        const version = await videoDb.getVersion();
        res.json({ version });
    } catch (err: unknown) {
        handleError(req, res, err, logger);
    }
};
