import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import winston from 'winston';

export const createGetLookupValuesHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res, next) => {
    const { path, table } = req.query;
    try {
        const videoDb = await site.getVideoDb(path as string);
        const values = await videoDb.getLookupValues(table as string);
        res.json(values);
    } catch (err: unknown) {
        next?.(err);
    }
};
