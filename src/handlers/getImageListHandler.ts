import { Request, Response } from 'express';
import { RequestHandler } from './RequestHandler';
import { Gallery } from '../services';

export const createGetImageListHandler = (gallery: Gallery): RequestHandler => async (req: Request, res: Response) => {
    const { path } = req.params;
    try {
        const imageList = await gallery.getGalleryData(path);
        res.json(imageList);
    } catch {
        res.sendStatus(404);
    }
};
