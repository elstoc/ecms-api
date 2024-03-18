import { Router } from 'express';
import { Logger } from 'winston';

import { ISite } from '../../services';
import { createGetDbVersionHandler } from './getDbVersionHandler';
import { createGetLookupValuesHandler } from './getLookupValuesHandler';

export const createMediaDbRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    const getDbVersionHandler = createGetDbVersionHandler(site, logger);
    const getLookupValuesHandler = createGetLookupValuesHandler(site, logger);

    router.get(
        '/version/:path(*)',
        getDbVersionHandler
    );

    router.get(
        '/lookup/:tableSuffix/:path(*)',
        getLookupValuesHandler
    );

    return router;
};
