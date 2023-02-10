import { Response } from 'express';

export type MarkdownMetadata = {
    [key: string]: string | number | boolean | undefined;
}

export type MarkdownStructure = {
    metadata?: MarkdownMetadata;
    children?: MarkdownStructure[];
}

export interface IMarkdownRecurse {
    getStructure(): Promise<MarkdownStructure>;
    getMetadata(): Promise<MarkdownMetadata>;
    sendFile(apiPath: string, response: Response): void;
}
