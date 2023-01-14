import { Request, Response } from 'express';
import winston from 'winston';
import { RequestHandler } from './RequestHandler';

export const createGetAuthTestHandler = (logger: winston.Logger): RequestHandler => async (req: Request, res: Response) => {
    res.sendStatus(200);
};
