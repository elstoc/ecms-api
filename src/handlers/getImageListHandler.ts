import winston from 'winston';
import { Request, Response } from 'express';
import { RequestHandler } from './RequestHandler';
import { Gallery } from '../services';

export const createGetImageListHandler = (gallery: Gallery, logger: winston.Logger): RequestHandler => async (req: Request, res: Response) => {
    const { path } = req.params;
    logger.log('info', `getting image list ${path}`);
    try {
        const imageList = await gallery.getGalleryData(path);
        res.json(imageList);
    } catch {
        res.sendStatus(404);
    }
};
