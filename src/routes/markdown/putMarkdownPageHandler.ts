import winston from 'winston';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import { handleError } from '../handleError';
import { NotPermittedError } from '../../errors';

export const createPutMarkdownPageHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res) => {
    const { mdPath } = req.params;
    logger.debug(`storing md page ${mdPath}`);
    try {
        if (!req.user || req.user.id === 'guest') {
            throw new NotPermittedError('User must be logged in to update markdown pages');
        }
        const { fileContents } = req.body;
        await site.writeMarkdownPage(mdPath, fileContents, req.user);
        res.sendStatus(200);
    } catch (err: unknown) {
        handleError(req, res, err, logger);
    }
};
