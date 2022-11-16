import { Router } from 'express';

import { RequestHandler } from '../handlers';

export const getMarkdownRouter = (getMarkdownHandler: RequestHandler): Router => {
    const router = Router();

    router.get(
        '/mdfile/:mdPath(*)',
        getMarkdownHandler
    );

    return router;
};
