import { Router } from 'express';

import { RequestHandler } from '../handlers/RequestHandler';

export const getGalleryRouter = (getImageHandler: RequestHandler): Router => {
    const router = Router();

    router.get(
        '/image/:path(*)',
        getImageHandler
    );

    return router;
};
