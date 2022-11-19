import { Request, Response } from 'express';
import { RequestHandler } from './RequestHandler';
import { Markdown } from '../services';

export const createGetMarkdownFileHandler = (markdown: Markdown): RequestHandler => async (req: Request, res: Response) => {
    const { mdPath } = req.params;
    const filePath = markdown.getMdFilePath(mdPath);
    try {
        res.sendFile(filePath);
    } catch {
        res.sendStatus(404);
    }
};
