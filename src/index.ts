import { createExpressApp } from './app';
import { createGetImageHandler } from './handlers/getImageHandler';
import { createGetImageListHandler } from './handlers/getImageListHandler';
import { getGalleryRouter } from './routes/gallery';
import { Gallery } from './utils';
import { getConfig } from './utils/config';

const start = async () => {
    const config = getConfig();
    const gallery = new Gallery(config);
    const getImageHandler = createGetImageHandler(gallery);
    const getImageListHandler = createGetImageListHandler(gallery);
    const galleryRouter = getGalleryRouter(getImageHandler, getImageListHandler);

    const app = createExpressApp(galleryRouter);

    const { port } = config;

    app.listen(port, () => {
        console.log(`app started, listening on port ${port}`);
    });
};

start();
