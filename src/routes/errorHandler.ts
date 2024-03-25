import { NextFunction, Request, Response } from 'express';
import { RequestWithUser } from './RequestHandler';
import { NotFoundError, NotPermittedError } from '../errors';
import winston from 'winston';

interface ExtraErrors extends Error {
    status?: number;
    errors?: {
        path: string;
        message: string;
        errorCode: string;
    }[]
}

export type ErrorHandler = (err: ExtraErrors, req: RequestWithUser, res: Response, next?: NextFunction) => void;

export const createErrorHandler = (logger: winston.Logger): ErrorHandler => (err, req, res, next) => {
    let status = 500;
    if (err instanceof NotFoundError) {
        status = 404;
    } else if (err instanceof NotPermittedError) {
        status = req.user ? 403 : 401;
    } else if (err.status) {
        status = err.status;
    }

    res.status(status).json({
      message: err.message,
      errors: err.errors,
    });
    
    logger.info(err instanceof Error ? err?.message : 'an error occurred');

    next && next();
};
