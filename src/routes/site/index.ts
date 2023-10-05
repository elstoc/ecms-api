import { Router } from 'express';
import { Logger } from 'winston';

import { ISite } from '../../services';
import { createGetSiteComponentsHandler } from './getSiteComponentsHandler';
import { createGetSiteConfigHandler } from './getSiteConfigHandler';

export const createSiteRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    const getSiteComponentsHandler = createGetSiteComponentsHandler(site, logger);
    const getSiteConfigHandler = createGetSiteConfigHandler(site);

    router.get(
        '/components',
        getSiteComponentsHandler
    );

    router.get(
        '/config',
        getSiteConfigHandler
    );

    return router;
};
