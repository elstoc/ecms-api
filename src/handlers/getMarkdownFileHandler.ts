import winston from 'winston';
import fs from 'fs';
import { Request, Response } from 'express';
import { RequestHandler } from './RequestHandler';
import { Markdown } from '../services';

export const createGetMarkdownFileHandler = (markdown: Markdown, logger: winston.Logger): RequestHandler => async (req: Request, res: Response) => {
    const { mdPath } = req.params;
    logger.log('info', `getting md file ${mdPath}`);
    try {
        const filePath = markdown.getMdFilePath(mdPath);
        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.send('# This page does not exist yet');
        }
    } catch {
        res.sendStatus(404);
    }
};
