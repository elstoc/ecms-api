import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { RequestHandler } from './RequestHandler';

export const createGetMarkdownFileHandler = (): RequestHandler => async (req: Request, res: Response) => {
    const { mdPath } = req.params;
    const contenDir = '/home/chris/coding/javascript/home-api/content/';
    let filePath = mdPath === '/' ? path.resolve(contenDir, 'index.md')
                                  : path.resolve(contenDir, `${mdPath}.md`);
    if (!fs.existsSync(filePath)) {
        filePath = path.resolve(contenDir, mdPath, 'index.md');
    }
    try {
        res.sendFile(filePath);
    } catch {
        res.sendStatus(404);
    }
};
