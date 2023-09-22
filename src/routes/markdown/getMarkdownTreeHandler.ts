import winston from 'winston';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import { handleError } from '../handleError';

export const createGetMarkdownTreeHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res) => {
    const { rootPath } = req.params;
    logger.debug(`getting md nav contents ${rootPath}`);
    try {
        const mdNavContents = await site.getMarkdownTree(rootPath, req.user);
        res.json(mdNavContents);
    } catch (err: unknown) {
        handleError(req, res, err, logger);
    }
};
