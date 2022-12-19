import { Request, Response } from 'express';
import { RequestHandler } from './RequestHandler';
import { GalleryImage } from '../services/GalleryImage';

export const createGetImageFileHandler = (galleryImage: GalleryImage): RequestHandler => async (req: Request, res: Response) => {
    const { path } = req.params;
    try {
        const size = req.query.size || 'thumb';
        if (size !== 'thumb' && size !== 'full') throw new Error('incorrect size description given');
        const fullPath = await galleryImage.resizeAndGetPath(path, size);
        res.sendFile(fullPath);
    } catch {
        res.sendStatus(404);
    }
};
