import { Response, Router } from 'express';
import { Logger } from 'winston';

import { IAuth, Tokens } from '../../services';
import { RequestWithUser } from '../RequestHandler.types';

const maxAge = 1000 * 60 * 60 * 24 * 365; // 1 year

const sendTokens = (tokens: Tokens, res: Response): void => {
    const { accessToken, accessTokenExpiry, refreshToken } = tokens;
    res.cookie('refresh_token', refreshToken, { httpOnly: true, maxAge, sameSite: true });
    res.json({ accessToken, accessTokenExpiry }).status(200);
};

export const createAuthRouter = (auth: IAuth, logger: Logger): Router => {
    const router = Router();

    router.post('/login',
        async (req, res) => {
            try {
                logger.info('logging in');
                const tokens = await auth.getTokensFromPassword(req.body.id, req.body.password);
                sendTokens(tokens, res);
            } catch (e: unknown) {
                res.sendStatus(401);
            }
        });

    router.post('/refresh',
        async (req, res) => {
            try {
                logger.info('refreshing tokens');
                const tokens = await auth.getTokensFromRefreshToken(req.cookies?.refresh_token);
                sendTokens(tokens, res);
            } catch (e: unknown) {
                res.sendStatus(401);
            }
        }
    );

    router.post('/changepassword',
        async (req, res) => {
            logger.info('changing password');
            try {
                const { id, newPassword, oldPassword } = req.body;
                await auth.setPassword(id, newPassword, oldPassword);
                res.sendStatus(200);
            } catch (e: unknown) {
                res.sendStatus(401);
            }
        }
    );

    router.post('/logout',
        async (req, res) => {
            logger.info('logging out');
            res.cookie('refresh_token', '', { httpOnly: true, sameSite: true });
            res.sendStatus(200);
        }
    );

    router.get('/get-user-info',
        async (req: RequestWithUser, res) => {
            const { user } = req;
            res.json(user).status(200);
        }
    );

    return router;
};
