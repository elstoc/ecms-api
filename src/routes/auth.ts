import express, { Router } from 'express';
import cookieParser from 'cookie-parser';

import { RequestHandler } from '../handlers';

export const getAuthRouter = (
    postAuthLoginHandler: RequestHandler,
    postAuthRefreshHandler: RequestHandler,
    postAuthLogoutHandler: RequestHandler,
    postAuthChangePasswordHandler: RequestHandler,
    getAuthTestHandler: RequestHandler
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
        cookieParser(),
        postAuthRefreshHandler
    );

    router.post(
        '/logout',
        postAuthLogoutHandler
    );

    router.get(
        '/testaccess',
        getAuthTestHandler
    );

    return router;
};
