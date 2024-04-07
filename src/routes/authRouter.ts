import { Router, Response } from 'express';
import { Logger } from 'winston';

import { IAuth, Tokens } from '../services';
import { RequestWithUser } from '../middleware';

const sendTokens = (tokens: Tokens, res: Response): void => {
    const maxAge = 1000 * 60 * 60 * 24 * 365; // 1 year
    const { accessToken, accessTokenExpiry, refreshToken } = tokens;
    res.cookie('refresh_token', refreshToken, { httpOnly: true, maxAge, sameSite: true });
    res.json({ accessToken, accessTokenExpiry }).status(200);
};

export const createAuthRouter = (auth: IAuth, logger: Logger): Router => {
    const authHandler = async (req: RequestWithUser, res: Response, fn: string): Promise<void> => {
        try {
            if (fn === 'login') {
                const tokens = await auth.getTokensFromPassword(req.body.id, req.body.password);
                sendTokens(tokens, res);
            } else if (fn === 'refresh') {
                const tokens = await auth.getTokensFromRefreshToken(req.cookies.refresh_token);
                sendTokens(tokens, res);
            } else if (fn === 'changePassword') {
                const { id, newPassword, oldPassword } = req.body;
                await auth.setPassword(id, newPassword, oldPassword);
                res.sendStatus(200);
            } else if (fn === 'logout') {
                res.cookie('refresh_token', '', { httpOnly: true, sameSite: true });
                res.sendStatus(200);
            } else if (fn === 'getUserInfo') {
                res.json(req.user);
            }
        } catch (err: unknown) {
            res.sendStatus(401);
        }
    };

    const router = Router();
    router.post('/login', async (req, res) => authHandler(req, res, 'login'));
    router.post('/refresh', async (req, res) => authHandler(req, res, 'refresh'));
    router.post('/changepassword', async (req, res) => authHandler(req, res, 'changePassword'));
    router.post('/logout', async (req, res) => authHandler(req, res, 'logout'));
    router.get('/get-user-info', async (req, res) => authHandler(req, res, 'getUserInfo'));
    return router;
};
