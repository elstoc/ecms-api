import { Router } from 'express';
import { Logger } from 'winston';

import { ISite, ImageSize } from '../services';

export const createGalleryRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    router.get('/contents',
        async (req, res, next) => {
            try {
                const limit = req.query.limit ? parseInt(req.query.limit.toString()) : undefined;
                const gallery = await site.getGallery(req.query.path as string);
                const images = await gallery.getContents(limit);
                res.json(images);
            } catch (err: unknown) {
                next?.(err);
            }
        }
    );
    router.get('/image',
        async (req, res, next) => {
            const { path, size, timestamp } = req.query;
            try {
                const gallery = await site.getGallery(path as string);
                const imageFileBuf = await gallery.getImageFile(path as string, size as ImageSize, timestamp as string);
                res.send(imageFileBuf);
            } catch (err: unknown) {
                next?.(err);
            }
        }
    );

    return router;
};
