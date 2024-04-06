import { Router } from 'express';
import { Logger } from 'winston';

import { ISite } from '../services';
import { RequestWithUser } from '../middleware/RequestHandler.types';

export const createSiteRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    router.get('/components',
        async (req: RequestWithUser, res, next) => {
            try {
                logger.debug('getting site Nav');
                const siteComponents = await site.listComponents(req.user);
                res.json(siteComponents);
            } catch (err: unknown) {
                next?.(err);
            }
        }
    );

    router.get('/config',
        async (req, res, next) => {
            try {
                res.json(site.getConfig()).status(200);
            } catch (err: unknown) {
                next?.(err);
            }
        }
    );

    return router;
};
