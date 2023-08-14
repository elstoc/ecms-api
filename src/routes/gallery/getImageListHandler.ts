import winston from 'winston';
import { Request, Response } from 'express';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';

export const createGetImageListHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req: Request, res: Response) => {
    const { path } = req.params;
    try {
        const limit = parseInt(req.query.limit?.toString() ?? '0');
        logger.log('info', `getting image list ${path} (${limit})`);
        const images = await site.getGalleryImages(path, limit);
        res.json(images);
    } catch (e: unknown) {
        if (e instanceof Error) {
            logger.error(`Error getting image list ${path}: ${e.message}`);
        }
        res.sendStatus(404);
    }
};
