import winston from 'winston';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import { NotPermittedError } from '../../errors';

export const createPutMarkdownPageHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res, next) => {
    try {
        if (!req.user || req.user.id === 'guest') {
            throw new NotPermittedError('User must be logged in to update markdown pages');
        }
        const { path, fileContents } = req.body;
        logger.debug(`storing md page ${path}`);
        const markdown = await site.getMarkdown(path);
        await markdown.writePage(path, fileContents, req.user);
        res.sendStatus(200);
    } catch (err: unknown) {
        next && next(err);
    }
};
