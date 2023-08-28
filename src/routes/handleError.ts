import { Response } from 'express';
import { NotFoundError, NotPermittedError } from '../errors';
import { RequestWithUser } from './RequestHandler';

export const handleError = (req: RequestWithUser, res: Response, error: unknown): void => {
    let status = 500;
    if (error instanceof NotFoundError) {
        status = 404;
    } else if (error instanceof NotPermittedError) {
        status = req.user ? 403 : 401;
    }
    res.sendStatus(status);
};
