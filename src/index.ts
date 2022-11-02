import * as dotenv from 'dotenv';

import { createExpressApp } from './app';
import { createGetImageHandler, createGetImageListHandler } from './handlers';
import { getGalleryRouter } from './routes';
import { Gallery } from './services';
import { getConfig } from './utils';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const start = async () => {
    const config = getConfig();
    const gallery = new Gallery(config);
    const getImageHandler = createGetImageHandler(gallery);
    const getImageListHandler = createGetImageListHandler(gallery);
    const galleryRouter = getGalleryRouter(getImageHandler, getImageListHandler);

    const app = createExpressApp(galleryRouter, config);

    const { port } = config;

    app.listen(port, () => {
        console.log(`app started, listening on port ${port}`);
    });
};

start();
