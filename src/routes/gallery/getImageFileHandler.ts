import { Request, Response } from 'express';
import { RequestHandler } from '../RequestHandler';
import { ImageSize, ISite } from '../../services';
import winston from 'winston';
import { handleError } from '../handleError';

export const createGetImageFileHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req: Request, res: Response) => {
    const { path } = req.params;
    const size = req.query.size ?? 'thumb';
    try {
        const imageFileBuf = await site.getGalleryImage(path, size as ImageSize,);
        res.send(imageFileBuf);
    } catch (err: unknown) {
        if (err instanceof Error) {
            logger.error(`Error getting image ${path} ${size}: ${err.message}`);
        }
        handleError(req, res, err);
    }
};
