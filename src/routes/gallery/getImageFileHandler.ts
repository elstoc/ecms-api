import { Request, Response } from 'express';
import { RequestHandler } from '../RequestHandler';
import { ImageSize, ISite } from '../../services';

export const createGetImageFileHandler = (site: ISite): RequestHandler => async (req: Request, res: Response) => {
    const { path } = req.params;
    try {
        const size = req.query.size ?? 'thumb';
        const imageFileBuf = await site.getGalleryImage(path, size as ImageSize,);
        res.send(imageFileBuf);
    } catch {
        res.sendStatus(404);
    }
};
