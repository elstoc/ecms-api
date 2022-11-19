import { Router } from 'express';

import { RequestHandler } from '../handlers';

export const getMarkdownRouter = (getMarkdownFileHandler: RequestHandler, getMarkdownNavHandler: RequestHandler): Router => {
    const router = Router();

    router.get(
        '/mdfile/:mdPath(*)',
        getMarkdownFileHandler
    );

    router.get(
        '/mdnav/:rootPath(*)',
        getMarkdownNavHandler
    );

    return router;
};
