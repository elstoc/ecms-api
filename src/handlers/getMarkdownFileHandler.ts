import fs from 'fs';
import { Request, Response } from 'express';
import { RequestHandler } from './RequestHandler';
import { Markdown } from '../services';

export const createGetMarkdownFileHandler = (markdown: Markdown): RequestHandler => async (req: Request, res: Response) => {
    const { mdPath } = req.params;
    try {
        const filePath = await markdown.getMdFilePath(mdPath);
        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.send('# This page does not exist yet');
        }
    } catch {
        res.sendStatus(404);
    }
};
