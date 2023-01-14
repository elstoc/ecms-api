import { Request, Response } from 'express';
import winston from 'winston';
import { IAuth } from '../../services';
import { RequestHandler } from '../RequestHandler';

export const createGetAuthTestHandler = (auth: IAuth, logger: winston.Logger): RequestHandler => async (req: Request, res: Response) => {
    try {
        const user = await auth.getUserInfoFromAuthHeader(req.headers['authorization']);
        logger.info(`getting user info for ${user.id}`);
        res.json(user).status(200);
    } catch (e: unknown) {
        if (e instanceof Error) {
            logger.error(e.message);
            res.sendStatus(401);
        }
    }
};
