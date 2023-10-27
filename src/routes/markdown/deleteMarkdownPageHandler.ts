import winston from 'winston';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';
import { handleError } from '../handleError';
import { NotPermittedError } from '../../errors';

export const createDeleteMarkdownPageHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res) => {
    const { mdPath } = req.params;
    logger.debug(`deleting md page ${mdPath}`);
    try {
        if (!req.user || req.user.id === 'guest') {
            throw new NotPermittedError('User must be logged in to delete markdown pages');
        }
        await site.deleteMarkdownPage(mdPath, req.user);
        res.sendStatus(200);
    } catch (err: unknown) {
        handleError(req, res, err, logger);
    }
};
