import { Request, Response } from 'express';
import { RequestHandler } from './RequestHandler';

export const createGetMarkdownHandler = (): RequestHandler => async (req: Request, res: Response) => {
    try {
        res.sendFile('/home/chris/coding/javascript/home-api/content/markdown/MarkdownTest.md');
    } catch {
        res.sendStatus(404);
    }
};
