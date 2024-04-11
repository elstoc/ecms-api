import { NextFunction, Response } from 'express';

import { RequestWithUser } from './types';
import { AuthenticationError, EndpointValidationError, NotFoundError, NotPermittedError } from '../errors';
import { ValidationError } from '../api/IEndpointValidator';

interface ExtraErrors extends Error {
    validationErrors?: ValidationError[],
}

export type ErrorHandler = (err: ExtraErrors, req: RequestWithUser, res: Response, next?: NextFunction) => void;

export const createErrorHandlerMiddleware = (): ErrorHandler => (err, req, res, next) => {
    let status = 500;
    if (err instanceof EndpointValidationError) {
        status = 400;
    } else if (err instanceof NotFoundError) {
        status = 404;
    } else if (err instanceof NotPermittedError) {
        status = req.user ? 403 : 401;
    } else if (err instanceof AuthenticationError) {
        status = 401;
    }

    if (err.validationErrors) {
        res.status(status).json({
          errors: err.validationErrors,
        });
    } else {
        res.sendStatus(status);
    }
    
    next?.();
};
