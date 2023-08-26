import winston from 'winston';
import { Request, Response } from 'express';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import { handleError } from '../handleError';

export const createGetSiteNavHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req: Request, res: Response) => {
    logger.debug('getting site Nav');
    try {
        const siteNavData = await site.listComponents();
        res.json(siteNavData);
    } catch (err: unknown) {
        if (err instanceof Error) {
            logger.error(`Error getting site nav: ${err.message}`);
        }
        handleError(req, res, err);
    }
};
