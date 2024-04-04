import winston from 'winston';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';

export const createGetMarkdownPageHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res, next) => {
    const { path } = req.query;
    logger.debug(`getting md page ${path}`);
    try {
        const markdown = await site.getMarkdown(path as string);
        const mdPage = await markdown.getPage(path as string, req.user);
        res.json(mdPage);
    } catch (err: unknown) {
        next?.(err);
    }
};
