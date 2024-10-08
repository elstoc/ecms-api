import { User } from '../auth';

export type MarkdownTree = {
    apiPath: string;
    uiPath: string;
    title?: string;
    weight?: number;
    restrict?: string;
    allowWrite?: string;
    children?: MarkdownTree[];
}

export type MarkdownPage = {
    content: string;
    pageExists: boolean;
    canWrite: boolean;
    canDelete: boolean;
    pathValid: boolean;
}

export interface IMarkdown {
    getTree(user?: User): Promise<MarkdownTree | undefined>;
    getPage(targetApiPath: string, user?: User): Promise<MarkdownPage>;
    writePage(targetApiPath: string, content: string, user?: User): Promise<void>;
    deletePage(targetApiPath: string, user?: User): Promise<void>;
    createContentFile(): Promise<void>;
}
