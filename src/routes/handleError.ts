import { Response } from 'express';
import { NotFoundError, NotPermittedError } from '../errors';
import { RequestWithUser } from './RequestHandler';
import { Logger } from 'winston';

export const handleError = (req: RequestWithUser, res: Response, error: unknown, logger: Logger): void => {
    let status = 500;
    if (error instanceof NotFoundError) {
        status = 404;
    } else if (error instanceof NotPermittedError) {
        status = req.user ? 403 : 401;
    }
    res.sendStatus(status);
    logger.info(error instanceof Error ? error?.message : error?.toString());
};
