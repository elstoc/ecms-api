import { AdditionalData } from '../site';

export type MarkdownStructure = {
    apiPath?: string;
    title?: string;
    uiPath?: string;
    weight?: number;
    restrict?: string;
    additionalData?: AdditionalData;
    children?: MarkdownStructure[];
}

export interface IMarkdownRecurse {
    getMdStructure(): Promise<MarkdownStructure>;
    getFile(apiPath: string): Promise<Buffer>;
}
