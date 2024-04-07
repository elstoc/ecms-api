import { Router, Response, NextFunction } from 'express';
import { Logger } from 'winston';

import { ISite } from '../services';
import { RequestWithUser } from '../middleware/RequestHandler.types';

export const createSiteRouter = (site: ISite, logger: Logger): Router => {
    const siteHandler = async (req: RequestWithUser, res: Response, next: NextFunction, fn: string): Promise<void> => {
        try {
            if (fn === 'getComponents') {
                const siteComponents = await site.listComponents(req.user);
                res.json(siteComponents);
            } else if (fn === 'getConfig') {
                res.json(site.getConfig());
            }
        } catch (err: unknown) {
            next?.(err);
        }
    };

    const router = Router();
    router.get('/components', async (req, res, next) => siteHandler(req, res, next, 'getComponents'));
    router.get('/config', async (req, res, next) => siteHandler(req, res, next, 'getConfig'));
    return router;
};
