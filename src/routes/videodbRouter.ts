import { Router, Response, NextFunction } from 'express';

import { ISite } from '../services';
import { RequestWithUser } from '../middleware';

export const createVideoDbRouter = (site: ISite): Router => {
    const videoDbHandler = async (req: RequestWithUser, res: Response, next: NextFunction, fn: string): Promise<void> => {
        try {
            const path = (req.query.path ?? req.body.path) as string;
            const videoDb = await site.getVideoDb(path);
            if (fn === 'getVersion') {
                const version = await videoDb.getVersion();
                res.json({ version });
            } else if (fn === 'getOmdbKey') {
                res.send(videoDb.getOmdbApiKey(req.user));
            } else if (fn === 'getLookup') {
                const values = await videoDb.getLookupValues(req.query.table as string);
                res.json(values);
            } else if (fn === 'getTags') {
                const tags = await videoDb.getAllTags();
                res.json(tags);
            } else if (fn === 'postVideo') {
                const id = await videoDb.addVideo(req.body.video, req.user);
                res.json({ id });
            } else if (fn === 'putVideo') {
                await videoDb.updateVideo(req.body.video, req.user);
                res.sendStatus(200);
            } else if (fn === 'getVideo') {
                const video = await videoDb.getVideo(parseInt(req.query.id as string));
                res.json(video);
            } else if (fn === 'getVideos') {
                const { maxLength, categories, tags, titleContains, limit } = req.query;
                const filters = {
                    maxLength: maxLength === undefined ? undefined : parseInt(maxLength as string),
                    categories: categories === undefined ? undefined : (categories as string)?.split('|'),
                    tags: tags === undefined ? undefined : (tags as string)?.split('|'),
                    titleContains: titleContains === undefined ? undefined : titleContains as string
                };
                const videos = await videoDb.queryVideos(filters, parseInt(limit as string));
                res.json(videos);
            }
        } catch (err: unknown) {
            next?.(err);
        }
    };

    const router = Router();
    router.get('/version', async (req, res, next) => videoDbHandler(req, res, next, 'getVersion'));
    router.get('/omdb-key', async (req, res, next) => videoDbHandler(req, res, next, 'getOmdbKey'));
    router.get('/lookup', async (req, res, next) => videoDbHandler(req, res, next, 'getLookup'));
    router.get('/tags', async (req, res, next) => videoDbHandler(req, res, next, 'getTags'));
    router.post('/video', async (req, res, next) => videoDbHandler(req, res, next, 'postVideo'));
    router.put('/video', async (req, res, next) => videoDbHandler(req, res, next, 'putVideo'));
    router.get('/video', async (req, res, next) => videoDbHandler(req, res, next, 'getVideo'));
    router.get('/videos', async (req, res, next) => videoDbHandler(req, res, next, 'getVideos'));
    return router;
};
