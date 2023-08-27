import express, { Router } from 'express';
import cookieParser from 'cookie-parser';
import { Logger } from 'winston';

import { createGetUserInfoHandler } from './getUserInfoHandler';
import { createPostAuthChangePasswordHandler } from './postAuthChangePasswordHandler';
import { createPostAuthLoginHandler } from './postAuthLoginHandler';
import { createPostAuthLogoutHandler } from './postAuthLogoutHandler';
import { createPostAuthRefreshHandler } from './postAuthRefreshHandler';
import { createGetUserInfoFromHeader } from '../getUserInfoFromHeader';
import { IAuth } from '../../services';

export const createAuthRouter = (auth: IAuth, logger: Logger): Router => {
    const router = Router();

    const postAuthLoginHandler = createPostAuthLoginHandler(auth, logger);
    const postAuthRefreshHandler = createPostAuthRefreshHandler(auth, logger);
    const postAuthLogoutHandler = createPostAuthLogoutHandler(logger);
    const postAuthChangePasswordHandler = createPostAuthChangePasswordHandler(auth, logger);
    const getUserInfoHandler = createGetUserInfoHandler();

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
        '/get-user-info',
        getUserInfoHandler
    );

    return router;
};
