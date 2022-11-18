import { Request, Response } from 'express';
import { RequestHandler } from './RequestHandler';
import { Gallery } from '../services';

export const createGetImageFileHandler = (gallery: Gallery): RequestHandler => async (req: Request, res: Response) => {
    const { path } = req.params;
    try {
        const size = req.query.size || 'thumb';
        if (size !== 'thumb' && size !== 'full') throw new Error('incorrect size description given');
        const fullPath = await gallery.getResizedImagePath(path, size);
        res.sendFile(fullPath);
    } catch {
        res.sendStatus(404);
    }
};
