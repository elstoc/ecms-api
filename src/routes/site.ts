import { Router } from 'express';

import { RequestHandler } from '../handlers';

export const getSiteRouter = (getSiteNavHandler: RequestHandler): Router => {
    const router = Router();

    router.get(
        '/nav',
        getSiteNavHandler
    );

    return router;
};
