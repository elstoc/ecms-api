import winston from 'winston';
import { IAuth } from '../../services';
import { RequestHandler } from '../RequestHandler';

export const createPostAuthRefreshHandler = (auth: IAuth, logger: winston.Logger): RequestHandler => async (req, res) => {
    logger.info('refreshing tokens');
    try {
        const currentRefreshToken = req.cookies?.refresh_token;
        const tokens = await auth.getTokensFromRefreshToken(currentRefreshToken);
        const { accessToken, accessTokenExpiry, refreshToken } = tokens;
        // TODO: set max age to the same as the refresh expiry
        const maxAge = 60 * 60 * 24 * 365; // 1 year
        res.cookie('refresh_token', refreshToken, { httpOnly: true, maxAge, sameSite: true });
        res.json({ accessToken, accessTokenExpiry}).status(200);
    } catch (e: unknown) {
        if (e instanceof Error) {
            logger.error(e.message);
        }
        res.sendStatus(401);
    }
};
