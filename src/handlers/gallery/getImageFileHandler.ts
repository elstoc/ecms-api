import { Request, Response } from 'express';
import { RequestHandler } from '../RequestHandler';
import { ImageSize, ISite } from '../../services';

export const createGetImageFileHandler = (site: ISite): RequestHandler => async (req: Request, res: Response) => {
    const { path } = req.params;
    try {
        const size = req.query.size ?? 'thumb';
        await site.sendGalleryImage(path, size as ImageSize, res);
    } catch {
        res.sendStatus(404);
    }
};
