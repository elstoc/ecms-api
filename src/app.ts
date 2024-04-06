import path from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { Logger } from 'winston';

import { IAuth, ISite } from './services';
import { createAuthRouter, createGalleryRouter, createMarkdownRouter, createSiteRouter, createVideoDbRouter } from './routes';
import { createGetUserInfoMiddleware, createErrorHandlerMiddleware, createValidateRequestMiddleware } from './middleware';
import { Config, EndpointValidator, OASParser } from './utils/site';

export const createApp = async (config: Config, logger: Logger, site: ISite, auth: IAuth): Promise<express.Express> => {
    const corsConfig = {
        origin: [config.uiUrl],
        credentials: true
    }; 

    const oasParser = new OASParser(path.join(__dirname, '../api.spec.yaml'));
    await oasParser.parseAndValidateSchema();
    const endpointValidationSchemas = oasParser.getAllValidationSchemas();
    const endpointValidator = new EndpointValidator(endpointValidationSchemas);

    const app = express();
    app.use(cors(corsConfig));

    app.use(express.json());
    app.use(createValidateRequestMiddleware(endpointValidator));
    app.use(createGetUserInfoMiddleware(auth));
    app.use(cookieParser());

    app.use('/auth', createAuthRouter(auth, logger));
    app.use('/site', createSiteRouter(site, logger));
    app.use('/gallery', createGalleryRouter(site, logger));
    app.use('/markdown', createMarkdownRouter(site, logger));
    app.use('/videodb', createVideoDbRouter(site, logger));

    app.use(createErrorHandlerMiddleware(logger));

    return app;
};
