import { Router, Response, NextFunction } from 'express';

import { ISite } from '../services';
import { RequestWithUser } from '../middleware';

export const createSiteRouter = (site: ISite): Router => {
    const siteHandler = async (req: RequestWithUser, res: Response, next: NextFunction, fn: string): Promise<void> => {
        try {
            if (fn === 'getComponents') {
                const components = await site.listComponents(req.user);
                res.json(components);
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
