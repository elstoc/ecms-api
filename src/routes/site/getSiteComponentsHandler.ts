import winston from 'winston';
import { RequestHandler } from '../RequestHandler';
import { ISite } from '../../services';

export const createGetSiteComponentsHandler = (site: ISite, logger: winston.Logger): RequestHandler => async (req, res, next) => {
    logger.debug('getting site Nav');
    try {
        const siteComponents = await site.listComponents(req.user);
        res.json(siteComponents);
    } catch (err: unknown) {
        if (err instanceof Error) {
            logger.error(`Error getting site components: ${err.message}`);
        }
        next?.(err);
    }
};
