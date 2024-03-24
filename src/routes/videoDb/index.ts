import { Router } from 'express';
import { Logger } from 'winston';

import { ISite } from '../../services';
import { createGetDbVersionHandler } from './getDbVersionHandler';
import { createGetLookupValuesHandler } from './getLookupValuesHandler';
import { createPostVideoHandler } from './postVideoHandler';

export const createVideoDbRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    router.get('/version', createGetDbVersionHandler(site, logger));
    router.get('/lookup', createGetLookupValuesHandler(site, logger));
    router.post('/video', createPostVideoHandler(site, logger));

    return router;
};
