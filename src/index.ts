import * as dotenv from 'dotenv';
import winston from 'winston';

import { createExpressApp } from './app';
import {
    createGetImageFileHandler, createGetImageListHandler, createGetMarkdownFileHandler,
    createGetMarkdownNavHandler, createPostAuthChangePasswordHandler, createPostAuthLoginHandler,
    createPostAuthLogoutHandler, createPostAuthRefreshHandler,
} from './handlers';
import { getAuthRouter, getGalleryRouter, getMarkdownRouter } from './routes';
import { Auth, Gallery, Markdown, SitePaths } from './services';
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
    const sitePaths = new SitePaths(config);
    const gallery = new Gallery(sitePaths);
    const markdown = new Markdown(sitePaths);
    const auth = new Auth(config, sitePaths);

    const getImageFileHandler = createGetImageFileHandler(gallery);
    const getMarkdownFileHandler = createGetMarkdownFileHandler(markdown, logger);
    const getMarkdownNavHandler = createGetMarkdownNavHandler(markdown, logger);
    const getImageListHandler = createGetImageListHandler(gallery, logger);
    const postAuthLoginHandler = createPostAuthLoginHandler(auth, logger);
    const postAuthRefreshHandler = createPostAuthRefreshHandler(auth, logger);
    const postAuthLogoutHandler = createPostAuthLogoutHandler(logger);
    const postAuthChangePasswordHandler = createPostAuthChangePasswordHandler(auth, logger);

    const galleryRouter = getGalleryRouter(getImageFileHandler, getImageListHandler);
    const markdownRouter = getMarkdownRouter(getMarkdownFileHandler, getMarkdownNavHandler);
    const authRouter = getAuthRouter(postAuthLoginHandler, postAuthRefreshHandler, postAuthLogoutHandler, postAuthChangePasswordHandler);

    const app = createExpressApp(galleryRouter, markdownRouter, authRouter, config);

    const { port } = config;

    app.listen(port, () => {
        console.log(`app started, listening on port ${port}`);
    });
};

start();
