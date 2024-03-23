import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import winston from 'winston';
import { handleError } from '../handleError';
import { Video } from '../../services/videodb/IVideoDb';

export const createPostVideoHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res) => {
    const { path } = req.params;
    try {
        const videoDb = await site.getVideoDb(path);
        await videoDb.addVideo(req.body as Video);
        res.sendStatus(200);
    } catch (err: unknown) {
        handleError(req, res, err, logger);
    }
};
