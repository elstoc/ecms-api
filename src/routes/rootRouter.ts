import express, { Router } from 'express';
import cookieParser from 'cookie-parser';
import { Logger } from 'winston';

import { IAuth, ISite } from '../services';
import { createAuthRouter, createGalleryRouter, createMarkdownRouter, createSiteRouter, createVideoDbRouter } from '.';
import { createAddUserInfoMiddleware, createErrorHandlerMiddleware, createValidateRequestMiddleware } from '../middleware';
import { IEndpointValidator } from '../api/IEndpointValidator';

export const createRootRouter = (logger: Logger, site: ISite, auth: IAuth, endpointValidator: IEndpointValidator): Router => {
    const router = Router();

    router.use(express.json());
    router.use(createValidateRequestMiddleware(endpointValidator));
    router.use(createAddUserInfoMiddleware(auth));
    router.use(cookieParser());

    router.use('/auth', createAuthRouter(auth, logger));
    router.use('/site', createSiteRouter(site, logger));
    router.use('/gallery', createGalleryRouter(site, logger));
    router.use('/markdown', createMarkdownRouter(site, logger));
    router.use('/videodb', createVideoDbRouter(site, logger));

    router.use(createErrorHandlerMiddleware(logger));

    return router;
};