import { Request, Response } from 'express';
import { RequestHandler } from './RequestHandler';

export const createPostAuthLogoutHandler = (): RequestHandler => async (req: Request, res: Response) => {
    res.sendStatus(200);
};
