import { Request, Response } from 'express';
import { RequestHandler } from './RequestHandler';
import { Gallery } from '../services/Gallery';

export const createGetImageHandler = (gallery: Gallery): RequestHandler => async (req: Request, res: Response) => {
    const { path } = req.params;
    try {
        const fullPath = await gallery.getResizedImagePath(path);
        res.sendFile(fullPath);
    } catch {
        res.sendStatus(404);
    }
};
