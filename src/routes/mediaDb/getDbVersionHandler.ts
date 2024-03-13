import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import winston from 'winston';
import { handleError } from '../handleError';

export const createGetDbVersionHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res) => {
    const { path } = req.params;
    try {
        const version = await site.getMediaDbVersion(path);
        res.json({ version });
    } catch (err: unknown) {
        if (err instanceof Error) {
            logger.error(`Error getting db version at ${path}`);
        }
        handleError(req, res, err, logger);
    }
};
