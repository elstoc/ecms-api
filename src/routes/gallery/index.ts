import { Router } from 'express';
import { Logger } from 'winston';

import { ISite } from '../../services';
import { createGetImageFileHandler } from './getImageFileHandler';
import { createGetGalleryContentsHandler } from './getGalleryContentsHandler';

export const createGalleryRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    router.get('/contents', createGetGalleryContentsHandler(site, logger));
    router.get('/image', createGetImageFileHandler(site, logger));

    return router;
};
