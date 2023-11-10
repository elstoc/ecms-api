import winston from 'winston';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import { handleError } from '../handleError';

export const createGetMarkdownPageHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res) => {
    const { mdPath } = req.params;
    logger.debug(`getting md page ${mdPath}`);
    try {
        const mdPage = await site.getMarkdownPage(mdPath, req.user);
        res.json(mdPage);
    } catch (err: unknown) {
        handleError(req, res, err, logger);
    }
};