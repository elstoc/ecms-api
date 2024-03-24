import winston from 'winston';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import { handleError } from '../handleError';
import { NotFoundError, NotPermittedError } from '../../errors';

export const createDeleteMarkdownPageHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res) => {
    const { path } = req.query;
    logger.debug(`deleting md page ${path}`);
    try {
        if (!req.user || req.user.id === 'guest') {
            throw new NotPermittedError('User must be logged in to delete markdown pages');
        }
        if (!path || typeof path !== 'string') {
            throw new NotFoundError('incorrect route parameters');
        }
        const markdown = await site.getMarkdown(path);
        await markdown.deletePage(path);
        res.sendStatus(200);
    } catch (err: unknown) {
        handleError(req, res, err, logger);
    }
};
