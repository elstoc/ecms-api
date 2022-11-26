import { Router } from 'express';

import { RequestHandler } from '../handlers';

export const getAuthRouter = (
    getAuthLoginHandler: RequestHandler,
    getAuthLogoutHandler: RequestHandler,
    getAuthRefreshHandler: RequestHandler,
    getAuthTestHandler: RequestHandler
): Router => {

    const router = Router();

    router.post(
        '/login',
        getAuthLoginHandler
    );

    router.get(
        '/logout',
        getAuthLogoutHandler
    );

    router.get(
        '/refresh',
        getAuthRefreshHandler
    );

    router.get(
        '/test',
        getAuthTestHandler
    );

    return router;
};
