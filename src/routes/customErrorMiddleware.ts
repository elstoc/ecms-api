import express from 'express';

interface ExtraErrors extends Error {
    status?: number;
    errors?: {
        path: string;
        message: string;
        errorCode: string;
    }[]
}

export const errorHandler = (err: ExtraErrors, req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(err.status || 500).json({
      message: err.message,
      errors: err.errors,
    });
    next();
};
