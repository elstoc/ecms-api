import { Router } from 'express';

import { RequestHandler } from '../handlers';

export const getAuthRouter = (
    postAuthLoginHandler: RequestHandler,
    postAuthRefreshHandler: RequestHandler,
    postAuthLogoutHandler: RequestHandler,
    postAuthChangePasswordHandler: RequestHandler,
): Router => {
    const router = Router();

    router.post(
        '/login',
        postAuthLoginHandler
    );

    router.post(
        '/changepassword',
        postAuthChangePasswordHandler
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
