import { Router } from 'express';

import { RequestHandler } from '../handlers';

export const getAuthRouter = (postAuthLoginHandler: RequestHandler, postAuthRefreshHandler: RequestHandler, postAuthLogoutHandler: RequestHandler): Router => {
    const router = Router();

    router.post(
        '/login',
        postAuthLoginHandler
    );

    router.post(
        '/refresh',
        postAuthRefreshHandler
    );

    router.post(
        '/logout',
        postAuthLogoutHandler
    );

    return router;
};
