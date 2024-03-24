import { Router } from 'express';
import { Logger } from 'winston';

import { ISite } from '../../services';
import { createGetSiteComponentsHandler } from './getSiteComponentsHandler';
import { createGetSiteConfigHandler } from './getSiteConfigHandler';

export const createSiteRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    router.get('/components', createGetSiteComponentsHandler(site, logger));
    router.get('/config', createGetSiteConfigHandler(site));

    return router;
};
