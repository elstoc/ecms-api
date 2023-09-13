import winston from 'winston';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import { handleError } from '../handleError';
import { NotPermittedError } from '../../errors';

export const createPutMarkdownFileHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res) => {
    const { mdPath } = req.params;
    logger.debug(`storing md file ${mdPath}`);
    try {
        if (!req.user || req.user.id === 'guest') {
            throw NotPermittedError;
        }
        const { fileContents } = req.body;
        await site.writeMarkdownFile(mdPath, fileContents, req.user);
    } catch (err: unknown) {
        handleError(req, res, err);
    }
};
