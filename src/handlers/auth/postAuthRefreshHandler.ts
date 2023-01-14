import { Request, Response } from 'express';
import winston from 'winston';
import { IAuth } from '../../services';
import { RequestHandler } from '../RequestHandler';

export const createPostAuthRefreshHandler = (auth: IAuth, logger: winston.Logger): RequestHandler => async (req: Request, res: Response) => {
    logger.info('refreshing access token');
    try {
        const currentRefreshToken = req.cookies?.refresh_token;
        const tokens = await auth.getTokensFromRefreshToken(currentRefreshToken);
        const { id, accessToken, accessTokenExpiry, refreshToken } = tokens;
        res.cookie('refresh_token', refreshToken, { httpOnly: true });
        res.json({ id, accessToken, accessTokenExpiry}).status(200);
    } catch (e: unknown) {
        if (e instanceof Error) {
            logger.error(e.message);
        }
        res.sendStatus(401);
    }
};
