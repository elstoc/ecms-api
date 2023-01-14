import { Request, Response } from 'express';
import winston from 'winston';
import { IAuth } from '../services';
import { RequestHandler } from './RequestHandler';

export const createPostAuthLoginHandler = (auth: IAuth, logger: winston.Logger): RequestHandler => async (req: Request, res: Response) => {
    logger.info('logging in');
    try {
        const { id, password } = req.body;
        const tokens = await auth.getTokensFromPassword(id, password);
        res.json(tokens).status(200);
    } catch (e: unknown) {
        if (e instanceof Error) {
            logger.error(e.message);
        }
        res.sendStatus(401);
    }
};
