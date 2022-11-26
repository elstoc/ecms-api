import * as dotenv from 'dotenv';
import winston from 'winston';

import { createExpressApp } from './app';
import { createGetImageFileHandler, createGetImageListHandler, createGetMarkdownFileHandler, createGetMarkdownNavHandler } from './handlers';
import { getGalleryRouter, getMarkdownRouter } from './routes';
import { Gallery } from './services';
import { Markdown } from './services';
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
    const gallery = new Gallery(config);
    const markdown = new Markdown(config);
    const getImageFileHandler = createGetImageFileHandler(gallery);
    const getMarkdownFileHandler = createGetMarkdownFileHandler(markdown, logger);
    const getMarkdownNavHandler = createGetMarkdownNavHandler(markdown, logger);
    const getImageListHandler = createGetImageListHandler(gallery, logger);
    const galleryRouter = getGalleryRouter(getImageFileHandler, getImageListHandler);
    const markdownRouter = getMarkdownRouter(getMarkdownFileHandler, getMarkdownNavHandler);

    const app = createExpressApp(galleryRouter, markdownRouter, config);

    const { port } = config;

    app.listen(port, () => {
        console.log(`app started, listening on port ${port}`);
    });
};

start();
