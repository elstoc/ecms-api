import { Request, Response } from 'express';
import winston from 'winston';
import { IAuth } from '../../services';
import { RequestHandler } from '../RequestHandler';

export const createPostAuthChangePasswordHandler = (auth: IAuth, logger: winston.Logger): RequestHandler => async (req: Request, res: Response) => {
    logger.info('changing password');
    try {
        const { id, newPassword, oldPassword } = req.body;
        await auth.setPassword(id, newPassword, oldPassword);
        res.sendStatus(200);
    } catch (e: unknown) {
        res.sendStatus(401);
    }
};
