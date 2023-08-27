import { RequestHandler } from '../RequestHandler';

export const createGetUserInfoHandler = (): RequestHandler => async (req, res) => {
    const { user } = req;
    res.json(user).status(200);
};
