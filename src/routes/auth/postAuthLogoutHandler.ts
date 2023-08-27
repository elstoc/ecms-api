import winston from 'winston';
import { RequestHandler } from '../RequestHandler';

export const createPostAuthLogoutHandler = (logger: winston.Logger): RequestHandler => async (req, res) => {
    logger.info('logging out');
    res.cookie('refresh_token', '', { httpOnly: true });
    res.sendStatus(200);
};
