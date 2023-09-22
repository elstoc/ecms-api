import { User } from '../auth';
import { AdditionalData } from '../site';

export type MarkdownTree = {
    apiPath?: string;
    title?: string;
    uiPath?: string;
    weight?: number;
    restrict?: string;
    allowWrite?: string;
    additionalData?: AdditionalData;
    children?: MarkdownTree[];
}

export interface IMarkdown {
    getMdStructure(user?: User): Promise<MarkdownTree | undefined>;
    getFile(apiPath: string, user?: User): Promise<Buffer>;
    writeFile(apiPath: string, content: string, user?: User): Promise<void>;
}
