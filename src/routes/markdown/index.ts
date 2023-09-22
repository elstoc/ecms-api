import express, { Router } from 'express';
import { Logger } from 'winston';

import { createGetMarkdownFileHandler } from './getMarkdownFileHandler';
import { createPutMarkdownFileHandler } from './putMarkdownFileHandler';
import { createGetMarkdownTreeHandler } from './getMarkdownTreeHandler';
import { ISite } from '../../services';

export const createMarkdownRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    const getMarkdownFileHandler = createGetMarkdownFileHandler(site, logger);
    const getMarkdownTreeHandler = createGetMarkdownTreeHandler(site, logger);
    const putMarkdownFileHandler = createPutMarkdownFileHandler(site, logger);

    router.get(
        '/file/:mdPath(*)',
        getMarkdownFileHandler
    );

    router.put(
        '/file/:mdPath(*)',
        express.json(),
        putMarkdownFileHandler
    );

    router.get(
        '/tree/:rootPath(*)',
        getMarkdownTreeHandler
    );

    return router;
};
