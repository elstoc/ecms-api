import winston from 'winston';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import { NotPermittedError } from '../../errors';

export const createGetMarkdownTreeHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res, next) => {
    const { path } = req.query;
    logger.debug(`getting md nav contents ${path}`);
    try {
        const markdown = await site.getMarkdown(path as string);
        const mdNavContents = await markdown.getTree(req.user);
        if (!mdNavContents) {
            throw new NotPermittedError();
        }
        res.json(mdNavContents);
    } catch (err: unknown) {
        next?.(err);
    }
};
