import { Router, Response, NextFunction } from 'express';
import { Logger } from 'winston';

import { ISite } from '../services';
import { RequestWithUser } from '../middleware';

export const createVideoDbRouter = (site: ISite, logger: Logger): Router => {
    const videoDbHandler = async (req: RequestWithUser, res: Response, next: NextFunction, fn: string): Promise<void> => {
        try {
            const path = (req.query.path ?? req.body.path) as string;
            const videoDb = await site.getVideoDb(path);
            if (fn === 'getVersion') {
                const version = await videoDb.getVersion();
                res.json({ version });
            } else if (fn === 'getLookup') {
                const values = await videoDb.getLookupValues(req.query.table as string);
                res.json(values);
            } else if (fn === 'postVideo') {
                await videoDb.addVideo(req.body.video);
                res.sendStatus(200);
            }
        } catch (err: unknown) {
            next?.(err);
        }
    };

    const router = Router();
    router.get('/version', async (req, res, next) => videoDbHandler(req, res, next, 'getVersion'));
    router.get('/lookup', async (req, res, next) => videoDbHandler(req, res, next, 'getLookup'));
    router.post('/video', async (req, res, next) => videoDbHandler(req, res, next, 'postVideo'));
    return router;
};
