import { Router } from 'express';
import { IAuth, ISite } from '../services';
import { Logger } from 'winston';
import { createSiteRouter } from './site';
import { createGalleryRouter } from './gallery';
import { createMarkdownRouter } from './markdown';
import { createAuthRouter } from './auth';
import { createVideoDbRouter } from './videoDb';
import { createUserInfoMiddleware } from './getUserInfoMiddleware';
import cookieParser from 'cookie-parser';

export const createRootRouter = (logger: Logger, site: ISite, auth: IAuth): Router => {
    const router = Router();

    router.use(createUserInfoMiddleware(auth));
    router.use(cookieParser());
    router.use('/auth', createAuthRouter(auth, logger));
    router.use('/site', createSiteRouter(site, logger));
    router.use('/gallery', createGalleryRouter(site, logger));
    router.use('/markdown', createMarkdownRouter(site, logger));
    router.use('/videodb', createVideoDbRouter(site, logger));

    return router;
};
