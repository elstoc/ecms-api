import winston from 'winston';
import { Request, Response } from 'express';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';

export const createGetMarkdownNavHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req: Request, res: Response) => {
    const { rootPath } = req.params;
    logger.log('info', `getting md nav contents ${rootPath}`);
    try {
        const mdNavContents = await site.getMarkdownStructure(rootPath);
        res.json(mdNavContents);
    } catch {
        res.sendStatus(404);
    }
};
