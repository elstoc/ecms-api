import { Router } from 'express';
import { Logger } from 'winston';

import { createGetMarkdownPageHandler } from './getMarkdownPageHandler';
import { createPutMarkdownPageHandler } from './putMarkdownPageHandler';
import { createDeleteMarkdownPageHandler } from './deleteMarkdownPageHandler';
import { createGetMarkdownTreeHandler } from './getMarkdownTreeHandler';
import { ISite } from '../../services';

export const createMarkdownRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    router.get('/page', createGetMarkdownPageHandler(site, logger));
    router.put('/page', createPutMarkdownPageHandler(site, logger));
    router.delete('/page', createDeleteMarkdownPageHandler(site, logger));
    router.get('/tree', createGetMarkdownTreeHandler(site, logger));

    return router;
};
