import { Router } from 'express';
import { Logger } from 'winston';

import { ISite } from '../../services';
import { createGetImageFileHandler } from './getImageFileHandler';
import { createGetGalleryContentsHandler } from './getGalleryContentsHandler';

export const createGalleryRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    const getImageFileHandler = createGetImageFileHandler(site, logger);
    const getGalleryContentsHandler = createGetGalleryContentsHandler(site, logger);

    router.get(
        '/image/:path(*)',
        getImageFileHandler
    );

    router.get(
        '/contents/:path(*)',
        getGalleryContentsHandler
    );

    return router;
};
