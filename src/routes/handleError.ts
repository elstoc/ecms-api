import { Request, Response } from 'express';
import { NotFoundError } from '../errors';

export const handleError = (req: Request, res: Response, error: unknown): void => {
    if (error instanceof NotFoundError) {
        res.sendStatus(404);
    } else {
        res.sendStatus(500);
    }
};
