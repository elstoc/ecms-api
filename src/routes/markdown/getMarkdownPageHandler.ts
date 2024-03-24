import winston from 'winston';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import { handleError } from '../handleError';

export const createGetMarkdownPageHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res) => {
    const { path } = req.query;
    logger.debug(`getting md page ${path}`);
    try {
        const markdown = await site.getMarkdown(path as string);
        const mdPage = await markdown.getPage(path as string, req.user);
        res.json(mdPage);
    } catch (err: unknown) {
        handleError(req, res, err, logger);
    }
};
