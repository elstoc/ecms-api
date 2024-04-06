import { Router } from 'express';
import { Logger } from 'winston';

import { ISite } from '../services';
import { RequestWithUser } from '../middleware/RequestHandler.types';

export const createMarkdownRouter = (site: ISite, logger: Logger): Router => {
    const router = Router();

    router.get('/tree',
        async (req: RequestWithUser, res, next) => {
            try {
                const { path } = req.query;
                logger.debug(`getting md nav contents ${path}`);
                const markdown = await site.getMarkdown(path as string);
                const mdNavContents = await markdown.getTree(req.user);
                res.json(mdNavContents);
            } catch (err: unknown) {
                next?.(err);
            }
        }
    );

    router.get('/page',
        async (req: RequestWithUser, res, next) => {
            try {
                const { path } = req.query;
                logger.debug(`getting md page ${path}`);
                const markdown = await site.getMarkdown(path as string);
                const mdPage = await markdown.getPage(path as string, req.user);
                res.json(mdPage);
            } catch (err: unknown) {
                next?.(err);
            }
        }
    );

    router.put('/page',
        async (req: RequestWithUser, res, next) => {
            try {
                const { path, fileContents } = req.body;
                logger.debug(`storing md page ${path}`);
                const markdown = await site.getMarkdown(path);
                await markdown.writePage(path, fileContents, req.user);
                res.sendStatus(200);
            } catch (err: unknown) {
                next?.(err);
            }
        }
    );

    router.delete('/page',
        async (req: RequestWithUser, res, next) => {
            try {
                const { path } = req.query;
                logger.debug(`deleting md page ${path}`);
                const markdown = await site.getMarkdown(path as string);
                await markdown.deletePage(path as string, req.user);
                res.sendStatus(200);
            } catch (err: unknown) {
                next?.(err);
            }
        }
    );

    return router;
};
