import { Router, Response, NextFunction } from 'express';
import { Logger } from 'winston';

import { ISite, ImageSize } from '../services';
import { RequestWithUser } from '../middleware/RequestHandler.types';

export const createGalleryRouter = (site: ISite, logger: Logger): Router => {
    const galleryHandler = async (req: RequestWithUser, res: Response, next: NextFunction, fn: string): Promise<void> => {
        try {
            const { path, size, limit, timestamp } = req.query;
            const gallery = await site.getGallery(path as string);
            if (fn === 'contents') {
                const images = await gallery.getContents(limit ? parseInt(limit.toString()) : undefined);
                res.json(images);
            } else if (fn === 'image') {
                const imageFileBuf = await gallery.getImageFile(path as string, size as ImageSize, timestamp as string);
                res.send(imageFileBuf);
            }
        } catch (err: unknown) {
            next?.(err);
        }
    };

    const router = Router();
    router.get('/contents', async (req, res, next) => galleryHandler(req, res, next, 'contents'));
    router.get('/image', async (req, res, next) => galleryHandler(req, res, next, 'image'));
    return router;
};
