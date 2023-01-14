import express, { Router } from 'express';

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
        express.json(),
        postAuthLoginHandler
    );

    router.post(
        '/changepassword',
        express.json(),
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
