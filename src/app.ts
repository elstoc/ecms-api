import path from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { Logger } from 'winston';

import { IAuth, ISite } from './services';
import { createAuthRouter, createGalleryRouter, createMarkdownRouter, createSiteRouter, createVideoDbRouter } from './routes';
import { createAddUserInfoMiddleware, createErrorHandlerMiddleware, createValidateRequestMiddleware } from './middleware';
import { Config } from './utils';
import { EndpointValidator, OASParser } from './api';

export const createApp = async (config: Config, logger: Logger, site: ISite, auth: IAuth): Promise<express.Express> => {
    const corsConfig = {
        origin: [config.uiUrl],
        credentials: true
    }; 

    const oasParser = new OASParser(path.join(__dirname, './api/api.spec.yaml'));
    await oasParser.parseAndValidateSchema();
    const endpointValidationSchemas = oasParser.getAllValidationSchemas();
    const endpointValidator = new EndpointValidator(endpointValidationSchemas);

    const app = express();
    app.use(cors(corsConfig));

    app.use(express.json());
    app.use(createValidateRequestMiddleware(endpointValidator));
    app.use(createAddUserInfoMiddleware(auth));
    app.use(cookieParser());

    app.use('/auth', createAuthRouter(auth, logger));
    app.use('/site', createSiteRouter(site, logger));
    app.use('/gallery', createGalleryRouter(site, logger));
    app.use('/markdown', createMarkdownRouter(site, logger));
    app.use('/videodb', createVideoDbRouter(site, logger));

    app.use(createErrorHandlerMiddleware(logger));

    return app;
};
