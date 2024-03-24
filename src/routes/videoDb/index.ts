import express, { Router } from 'express';
import { Logger } from 'winston';

import { ISite } from '../../services';
import { createGetDbVersionHandler } from './getDbVersionHandler';
import { createGetLookupValuesHandler } from './getLookupValuesHandler';
import { createPostVideoHandler } from './postVideoHandler';

export const createVideoDbRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    const getDbVersionHandler = createGetDbVersionHandler(site, logger);
    const getLookupValuesHandler = createGetLookupValuesHandler(site, logger);
    const postVideoHandler = createPostVideoHandler(site, logger);

    router.get(
        '/version',
        getDbVersionHandler
    );

    router.get(
        '/lookup',
        getLookupValuesHandler
    );

    router.post(
        '/video',
        express.json(),
        postVideoHandler
    );

    return router;
};
