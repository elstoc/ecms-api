import { NextFunction, Request, Response } from 'express';

import { User } from '../services';

export interface RequestWithUser extends Request {
    user?: User
}

export type RequestHandler = (req: RequestWithUser, res: Response, next?: NextFunction) => void;
