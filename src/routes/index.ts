import { Router } from 'express';
import { IAuth, ISite } from '../services';
import { Logger } from 'winston';
import { createSiteRouter } from './site';
import { createGalleryRouter } from './gallery';
import { createMarkdownRouter } from './markdown';
import { createAuthRouter } from './auth';
import { createVideoDbRouter } from './videoDb';
import { createGetUserInfoFromHeader } from './getUserInfoFromHeader';

export const createRootRouter = (logger: Logger, site: ISite, auth: IAuth): Router => {
    const router = Router();

    const siteRouter = createSiteRouter(site, logger);
    const galleryRouter = createGalleryRouter(site, logger);
    const markdownRouter = createMarkdownRouter(site, logger);
    const videoDbRouter = createVideoDbRouter(site, logger);
    const authRouter = createAuthRouter(auth, logger);
    const userInfoMiddleware = createGetUserInfoFromHeader(auth);

    router.use(userInfoMiddleware);
    router.use('/site', siteRouter);
    router.use('/gallery', galleryRouter);
    router.use('/markdown', markdownRouter);
    router.use('/videodb', videoDbRouter);
    router.use('/auth', authRouter);

    return router;
};
