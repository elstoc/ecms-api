import winston from 'winston';
import { IAuth } from '../../services';
import { RequestHandler } from '../RequestHandler';

export const createPostAuthLoginHandler = (auth: IAuth, logger: winston.Logger): RequestHandler => async (req, res) => {
    logger.info('logging in');
    try {
        const { id, password } = req.body;
        const tokens = await auth.getTokensFromPassword(id, password);
        const { accessToken, accessTokenExpiry, refreshToken } = tokens;
        // TODO: set max age to the same as the refresh token expiry
        // TODO: remove duplication with logout/refresh
        const maxAge = 1000 * 60 * 60 * 24 * 365; // 1 year
        res.cookie('refresh_token', refreshToken, { httpOnly: true, maxAge, sameSite: true });
        res.json({ accessToken, accessTokenExpiry}).status(200);
    } catch (e: unknown) {
        if (e instanceof Error) {
            logger.error(e.message);
        }
        res.sendStatus(401);
    }
};
