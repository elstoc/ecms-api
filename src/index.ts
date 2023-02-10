import * as dotenv from 'dotenv';
import winston from 'winston';

import { createExpressApp } from './app';
import {
    createGetImageFileHandler, createGetImageListHandler, createGetMarkdownFileHandler,
    createGetMarkdownNavHandler, createPostAuthChangePasswordHandler, createPostAuthLoginHandler,
    createPostAuthLogoutHandler, createPostAuthRefreshHandler, createGetAuthTestHandler,
    createGetSiteNavHandler
} from './handlers';
import { getSiteRouter, getAuthRouter, getGalleryRouter, getMarkdownRouter } from './routes';
import { Auth, Site } from './services';
import { getConfig } from './utils';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const start = async () => {
    const logger = winston.createLogger({
        level: 'info',
        format: winston.format.simple(),
        transports: [
            new winston.transports.Console(),
        ]
    });

    const config = getConfig();
    const site = new Site(config);
    const auth = new Auth(config);

    const getSiteNavHandler = createGetSiteNavHandler(site, logger);
    const getImageFileHandler = createGetImageFileHandler(site);
    const getMarkdownFileHandler = createGetMarkdownFileHandler(site, logger);
    const getMarkdownNavHandler = createGetMarkdownNavHandler(site, logger);
    const getImageListHandler = createGetImageListHandler(site, logger);
    const postAuthLoginHandler = createPostAuthLoginHandler(auth, logger);
    const postAuthRefreshHandler = createPostAuthRefreshHandler(auth, logger);
    const postAuthLogoutHandler = createPostAuthLogoutHandler(logger);
    const postAuthChangePasswordHandler = createPostAuthChangePasswordHandler(auth, logger);
    const getAuthTestHandler = createGetAuthTestHandler(auth, logger);

    const galleryRouter = getGalleryRouter(getImageFileHandler, getImageListHandler);
    const markdownRouter = getMarkdownRouter(getMarkdownFileHandler, getMarkdownNavHandler);
    const authRouter = getAuthRouter(postAuthLoginHandler, postAuthRefreshHandler, postAuthLogoutHandler, postAuthChangePasswordHandler, getAuthTestHandler);
    const siteRouter = getSiteRouter(getSiteNavHandler);

    const app = createExpressApp(siteRouter, galleryRouter, markdownRouter, authRouter, config);

    const { port } = config;

    app.listen(port, () => {
        console.log(`app started, listening on port ${port}`);
    });
};

start();
