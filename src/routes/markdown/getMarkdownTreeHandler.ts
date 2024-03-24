import winston from 'winston';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import { handleError } from '../handleError';
import { NotPermittedError } from '../../errors';

export const createGetMarkdownTreeHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res) => {
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
        handleError(req, res, err, logger);
    }
};
