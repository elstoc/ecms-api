import winston from 'winston';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import { handleError } from '../handleError';
import { NotPermittedError } from '../../errors';

export const createGetMarkdownTreeHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res) => {
    const { rootPath } = req.params;
    logger.debug(`getting md nav contents ${rootPath}`);
    try {
        const markdown = await site.getMarkdown(rootPath);
        const mdNavContents = await markdown.getTree(req.user);
        if (!mdNavContents) {
            throw new NotPermittedError();
        }
        res.json(mdNavContents);
    } catch (err: unknown) {
        handleError(req, res, err, logger);
    }
};
