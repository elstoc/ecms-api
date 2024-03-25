import winston from 'winston';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import { NotFoundError } from '../../errors';

export const createGetMarkdownPageHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res, next) => {
    const { path } = req.query;
    logger.debug(`getting md page ${path}`);
    try {
        if (!path || typeof path !== 'string') {
            throw new NotFoundError('incorrect route parameters');
        }
        const markdown = await site.getMarkdown(path);
        const mdPage = await markdown.getPage(path, req.user);
        res.json(mdPage);
    } catch (err: unknown) {
        next && next(err);
    }
};
