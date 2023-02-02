import winston from 'winston';
import { Request, Response } from 'express';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';

export const createGetSiteNavHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req: Request, res: Response) => {
    logger.log('info', 'getting site Nav');
    try {
        const siteNavData = site.getNavData();
        res.json(siteNavData);
    } catch {
        res.sendStatus(404);
    }
};
