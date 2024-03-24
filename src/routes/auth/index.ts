import { Router } from 'express';
import { Logger } from 'winston';

import { createGetUserInfoHandler } from './getUserInfoHandler';
import { createPostAuthChangePasswordHandler } from './postAuthChangePasswordHandler';
import { createPostAuthLoginHandler } from './postAuthLoginHandler';
import { createPostAuthLogoutHandler } from './postAuthLogoutHandler';
import { createPostAuthRefreshHandler } from './postAuthRefreshHandler';
import { IAuth } from '../../services';

export const createAuthRouter = (auth: IAuth, logger: Logger): Router => {
    const router = Router();

    router.post( '/login', createPostAuthLoginHandler(auth, logger));
    router.post( '/changepassword', createPostAuthChangePasswordHandler(auth, logger));
    router.post( '/refresh', createPostAuthRefreshHandler(auth, logger));
    router.post( '/logout', createPostAuthLogoutHandler(logger));
    router.get( '/get-user-info', createGetUserInfoHandler());

    return router;
};
