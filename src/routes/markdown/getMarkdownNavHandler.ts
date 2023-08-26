import winston from 'winston';
import { Request, Response } from 'express';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import { handleError } from '../handleError';

export const createGetMarkdownNavHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req: Request, res: Response) => {
    const { rootPath } = req.params;
    logger.debug(`getting md nav contents ${rootPath}`);
    try {
        const mdNavContents = await site.getMarkdownStructure(rootPath);
        res.json(mdNavContents);
    } catch (err: unknown) {
        if (err instanceof Error) {
            logger.error(`Error getting markdown nav ${rootPath}: ${err.message}`);
        }
        handleError(req, res, err);
    }
};
