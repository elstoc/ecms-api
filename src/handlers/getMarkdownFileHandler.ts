import { Request, Response } from 'express';
import { RequestHandler } from './RequestHandler';
import { Markdown } from '../services';

export const createGetMarkdownFileHandler = (markdown: Markdown): RequestHandler => async (req: Request, res: Response) => {
    const { mdPath } = req.params;
    const mdMeta = markdown.getMdFileMeta(mdPath);
    try {
        res.sendFile(mdMeta.filePath);
    } catch {
        res.sendStatus(404);
    }
};
