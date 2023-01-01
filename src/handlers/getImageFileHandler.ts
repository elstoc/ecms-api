import { Request, Response } from 'express';
import { RequestHandler } from './RequestHandler';
import { Gallery } from '../services';
import { ImageSize } from '../services/GalleryImage';

export const createGetImageFileHandler = (gallery: Gallery): RequestHandler => async (req: Request, res: Response) => {
    const { path } = req.params;
    try {
        const size = req.query.size || 'thumb';
        const fullPath = await gallery.resizeImageAndGetPath(path, (size as ImageSize));
        res.sendFile(fullPath);
    } catch {
        res.sendStatus(404);
    }
};
