import winston from 'winston';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import { handleError } from '../handleError';

export const createGetMarkdownFileHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res) => {
    const { mdPath } = req.params;
    logger.debug(`getting md file ${mdPath}`);
    try {
        const mdFileBuf = await site.getMarkdownFile(mdPath, req.user);
        res.send(mdFileBuf);
    } catch (err: unknown) {
        handleError(req, res, err, logger);
    }
};
