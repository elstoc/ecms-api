import express, { Router } from 'express';
import { Logger } from 'winston';

import { createGetMarkdownPageHandler } from './getMarkdownPageHandler';
import { createPutMarkdownPageHandler } from './putMarkdownPageHandler';
import { createDeleteMarkdownPageHandler } from './deleteMarkdownPageHandler';
import { createGetMarkdownTreeHandler } from './getMarkdownTreeHandler';
import { ISite } from '../../services';

export const createMarkdownRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    const getMarkdownPageHandler = createGetMarkdownPageHandler(site, logger);
    const getMarkdownTreeHandler = createGetMarkdownTreeHandler(site, logger);
    const putMarkdownPageHandler = createPutMarkdownPageHandler(site, logger);
    const deleteMarkdownPageHandler = createDeleteMarkdownPageHandler(site, logger);

    router.get(
        '/page/:mdPath(*)',
        getMarkdownPageHandler
    );

    router.put(
        '/page/:mdPath(*)',
        express.json(),
        putMarkdownPageHandler
    );

    router.delete(
        '/page/:mdPath(*)',
        deleteMarkdownPageHandler
    );

    router.get(
        '/tree/:rootPath(*)',
        getMarkdownTreeHandler
    );

    return router;
};
