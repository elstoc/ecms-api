import * as dotenv from 'dotenv';

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
    const config = getConfig();
    const gallery = new Gallery(config);
    const markdown = new Markdown(config);
    const getImageFileHandler = createGetImageFileHandler(gallery);
    const getMarkdownFileHandler = createGetMarkdownFileHandler(markdown);
    const getMarkdownNavHandler = createGetMarkdownNavHandler(markdown);
    const getImageListHandler = createGetImageListHandler(gallery);
    const galleryRouter = getGalleryRouter(getImageFileHandler, getImageListHandler);
    const markdownRouter = getMarkdownRouter(getMarkdownFileHandler, getMarkdownNavHandler);

    const app = createExpressApp(galleryRouter, markdownRouter, config);

    const { port } = config;

    app.listen(port, () => {
        console.log(`app started, listening on port ${port}`);
    });
};

start();
