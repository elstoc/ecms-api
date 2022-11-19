import { Request, Response } from 'express';
import { RequestHandler } from './RequestHandler';
import { Markdown } from '../services';

export const createGetMarkdownNavHandler = (markdown: Markdown): RequestHandler => async (req: Request, res: Response) => {
    const { rootPath } = req.params;
    try {
        const mdNavContents = markdown.getMdNavContents(rootPath);
        res.json(mdNavContents);
    } catch {
        res.sendStatus(404);
    }
};
