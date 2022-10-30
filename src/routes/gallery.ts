import { Router } from 'express';

import { RequestHandler } from '../handlers/RequestHandler';

export const getGalleryRouter = (getImageHandler: RequestHandler, getImageListHandler: RequestHandler): Router => {
    const router = Router();

    router.get(
        '/image/:path(*)',
        getImageHandler
    );

    router.get(
        '/imagelist/:path(*)',
        getImageListHandler
    );

    return router;
};
