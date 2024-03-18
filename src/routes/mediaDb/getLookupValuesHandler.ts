import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import winston from 'winston';
import { handleError } from '../handleError';
import { LookupTables } from '../../services/mediadb/IMediaDb';

export const createGetLookupValuesHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res) => {
    const { path, tableSuffix } = req.params;
    try {
        const mediaDb = await site.getMediaDb(path);
        const values = await mediaDb.getLookupValues(tableSuffix as LookupTables);
        res.json(values);
    } catch (err: unknown) {
        handleError(req, res, err, logger);
    }
};
