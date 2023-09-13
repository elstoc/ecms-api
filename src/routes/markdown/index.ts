import express, { Router } from 'express';
import { Logger } from 'winston';

import { createGetMarkdownFileHandler } from './getMarkdownFileHandler';
import { createPutMarkdownFileHandler } from './putMarkdownFileHandler';
import { createGetMarkdownNavHandler } from './getMarkdownNavHandler';
import { ISite } from '../../services';

export const createMarkdownRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    const getMarkdownFileHandler = createGetMarkdownFileHandler(site, logger);
    const getMarkdownNavHandler = createGetMarkdownNavHandler(site, logger);
    const putMarkdownFileHandler = createPutMarkdownFileHandler(site, logger);

    router.get(
        '/mdfile/:mdPath(*)',
        getMarkdownFileHandler
    );

    router.put(
        '/mdfile/:mdPath(*)',
        express.json(),
        putMarkdownFileHandler
    );

    router.get(
        '/mdnav/:rootPath(*)',
        getMarkdownNavHandler
    );

    return router;
};
