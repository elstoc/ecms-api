import { Router } from 'express';
import { Logger } from 'winston';

import { ISite } from '../../services';
import { createGetSiteComponentsHandler } from './getSiteComponentsHandler';

export const createSiteRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    const getSiteComponentsHandler = createGetSiteComponentsHandler(site, logger);

    router.get(
        '/components',
        getSiteComponentsHandler
    );

    return router;
};
