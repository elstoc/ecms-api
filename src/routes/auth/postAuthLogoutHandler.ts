import winston from 'winston';
import { RequestHandler } from '../RequestHandler';

export const createPostAuthLogoutHandler = (logger: winston.Logger): RequestHandler => async (req, res) => {
    logger.info('logging out');
    // TODO: remove duplication with login/refresh
    res.cookie('refresh_token', '', { httpOnly: true, sameSite: true });
    res.sendStatus(200);
};
