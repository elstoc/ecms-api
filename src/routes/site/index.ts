import { Router } from 'express';
import { Logger } from 'winston';

import { ISite } from '../../services';
import { createGetSiteNavHandler } from './getSiteNavHandler';

export const createSiteRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    const getSiteNavHandler = createGetSiteNavHandler(site, logger);

    router.get(
        '/nav',
        getSiteNavHandler
    );

    return router;
};
