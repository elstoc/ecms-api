import { NextFunction, Response } from 'express';
import winston from 'winston';

import { RequestWithUser } from '../RequestHandler';
import { EndpointValidationError, NotFoundError, NotPermittedError } from '../../errors';
import { ValidationError } from '../../utils/site/IEndpointValidator';

interface ExtraErrors extends Error {
    validationErrors?: ValidationError[],
}

export type ErrorHandler = (err: ExtraErrors, req: RequestWithUser, res: Response, next?: NextFunction) => void;

export const createErrorHandlerMiddleware = (logger: winston.Logger): ErrorHandler => (err, req, res, next) => {
    let status = 500;
    if (err instanceof EndpointValidationError) {
        status = 400;
    } else if (err instanceof NotFoundError) {
        status = 404;
    } else if (err instanceof NotPermittedError) {
        status = req.user ? 403 : 401;
    }

    res.status(status).json({
      message: err.message,
      errors: err.validationErrors,
    });
    
    logger.info(err instanceof Error ? err?.message : 'an error occurred');

    next?.();
};
