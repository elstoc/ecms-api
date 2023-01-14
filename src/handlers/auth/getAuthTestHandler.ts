import { Request, Response } from 'express';
import winston from 'winston';
import { IAuth, User } from '../../services';
import { RequestHandler } from '../RequestHandler';

export const createGetAuthTestHandler = (auth: IAuth, logger: winston.Logger): RequestHandler => async (req: Request, res: Response) => {
    const authHeaders = req.headers['authorization'];
    let user: User;
    try {
        if (authHeaders?.startsWith('Bearer ')) {
            const bearerToken = authHeaders?.substring(7);
            user = await auth.getUserInfoFromAccessToken(bearerToken);
        } else {
            logger.info('bearer token not found, logged in as guest');
            user = { id: 'guest', fullName: 'Guest', roles: [] };
        }
        logger.info(`getting page for ${user.id}`);
        res.json(user).status(200);
    } catch (e: unknown) {
        if (e instanceof Error) {
            logger.error(e.message);
            res.sendStatus(401);
        }
    }
};
