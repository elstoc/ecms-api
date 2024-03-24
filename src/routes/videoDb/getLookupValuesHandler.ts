import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import winston from 'winston';
import { handleError } from '../handleError';
import { NotFoundError } from '../../errors';

export const createGetLookupValuesHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res) => {
    const { path, table } = req.query;
    try {
        if (!path || !table || typeof path !== 'string' || typeof table !== 'string') {
            throw new NotFoundError('incorrect route parameters');
        }
        const videoDb = await site.getVideoDb(path);
        const values = await videoDb.getLookupValues(table);
        res.json(values);
    } catch (err: unknown) {
        handleError(req, res, err, logger);
    }
};
