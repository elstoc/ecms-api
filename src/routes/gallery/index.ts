import { Router } from 'express';
import { Logger } from 'winston';

import { ISite } from '../../services';
import { createGetImageFileHandler } from './getImageFileHandler';
import { createGetImageListHandler } from './getImageListHandler';

export const createGalleryRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    const getImageFileHandler = createGetImageFileHandler(site, logger);
    const getImageListHandler = createGetImageListHandler(site, logger);

    router.get(
        '/image/:path(*)',
        getImageFileHandler
    );

    router.get(
        '/imagelist/:path(*)',
        getImageListHandler
    );

    return router;
};
