import winston from 'winston';
import { Request, Response } from 'express';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';

export const createGetMarkdownFileHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req: Request, res: Response) => {
    const { mdPath } = req.params;
    logger.log('info', `getting md file ${mdPath}`);
    try {
        const mdFileBuf = await site.getMarkdownFile(mdPath);
        res.send(mdFileBuf);
    } catch {
        res.sendStatus(404);
    }
};
