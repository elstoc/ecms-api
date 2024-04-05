import { Router } from 'express';
import { Logger } from 'winston';

import { ISite } from '../../services';

export const createVideoDbRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    router.get('/version',
        async (req, res, next) => {
            try {
                const { path } = req.query;
                const videoDb = await site.getVideoDb(path as string);
                const version = await videoDb.getVersion();
                res.json({ version });
            } catch (err: unknown) {
                next?.(err);
            }
        }
    );

    router.get('/lookup',
        async (req, res, next) => {
            try {
                const { path, table } = req.query;
                const videoDb = await site.getVideoDb(path as string);
                const values = await videoDb.getLookupValues(table as string);
                res.json(values);
            } catch (err: unknown) {
                next?.(err);
            }
        }
    );

    router.post('/video',
        async (req, res, next) => {
            try {
                const { path, video } = req.body;
                const videoDb = await site.getVideoDb(path);
                await videoDb.addVideo(video);
                res.sendStatus(200);
            } catch (err: unknown) {
                next?.(err);
            }
        }
    );

    return router;
};
