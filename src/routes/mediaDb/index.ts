import { Router } from 'express';
import { Logger } from 'winston';

import { ISite } from '../../services';
import { createGetDbVersionHandler } from './getDbVersionHandler';

export const createMediaDbRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    const getDbVersionHandler = createGetDbVersionHandler(site, logger);

    router.get(
        '/:path(*)',
        getDbVersionHandler
    );

    return router;
};
