import winston from 'winston';
import { Request, Response } from 'express';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';

export const createGetImageListHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req: Request, res: Response) => {
    try {
        const { path } = req.params;
        const limit = parseInt(req.query.limit?.toString() || '0');
        logger.log('info', `getting image list ${path} (${limit})`);
        const imageList = await site.getGalleryData(path, limit);
        res.json(imageList);
    } catch {
        res.sendStatus(404);
    }
};
