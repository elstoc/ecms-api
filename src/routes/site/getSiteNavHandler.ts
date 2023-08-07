import winston from 'winston';
import { Request, Response } from 'express';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';

export const createGetSiteNavHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req: Request, res: Response) => {
    logger.log('info', 'getting site Nav');
    try {
        const siteNavData = await site.listComponents();
        res.json(siteNavData);
    } catch (e: unknown) {
        if (e instanceof Error) logger.log('error', e.message);
        res.sendStatus(404);
    }
};
