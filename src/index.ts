import { createExpressApp } from './app';
import { createGetImageHandler } from './handlers/getImageHandler';
import { getGalleryRouter } from './routes/gallery';
import { Gallery } from './utils';
import { getConfig } from './utils/config';

const start = async () => {
    const config = getConfig();
    const gallery = new Gallery(config);
    const getImageHandler = createGetImageHandler(gallery);
    const galleryRouter = getGalleryRouter(getImageHandler);

    const app = createExpressApp(galleryRouter);

    app.listen(3012, () => {
        console.log('app started, listening on port 3012');
    });
};

start();
