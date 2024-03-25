import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import winston from 'winston';

export const createPostVideoHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res, next) => {
    const { path, video } = req.body;
    try {
        const videoDb = await site.getVideoDb(path);
        await videoDb.addVideo(video);
        res.sendStatus(200);
    } catch (err: unknown) {
        next?.(err);
    }
};
