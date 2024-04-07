import { IAuth } from '../services';
import { RequestHandler } from './types';

export const createGetUserInfoMiddleware = (auth: IAuth): RequestHandler => async (req, res, next) => {
    try {
        const user = await auth.getUserInfoFromAuthHeader(req.headers['authorization']);
        req['user'] = user;
        next?.();
    } catch (err: unknown) {
        next?.(err);
    }
};
