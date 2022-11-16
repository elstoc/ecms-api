import { Request, Response } from 'express';
import path from 'path';
import { RequestHandler } from './RequestHandler';

export const createGetMarkdownHandler = (): RequestHandler => async (req: Request, res: Response) => {
    const { mdPath } = req.params;
    const contenDir = '/home/chris/coding/javascript/home-api/content/markdown/';
    const filePath = path.resolve(contenDir, mdPath);
    try {
        res.sendFile(filePath);
    } catch {
        res.sendStatus(404);
    }
};
