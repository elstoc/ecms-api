import { User } from '../auth';
import { AdditionalData } from '../site';

export type MarkdownStructure = {
    apiPath?: string;
    title?: string;
    uiPath?: string;
    weight?: number;
    restrict?: string;
    allowWrite?: string;
    additionalData?: AdditionalData;
    children?: MarkdownStructure[];
}

export interface IMarkdownRecurse {
    getMdStructure(user?: User): Promise<MarkdownStructure | undefined>;
    getFile(apiPath: string, user?: User): Promise<Buffer>;
    writeFile(apiPath: string, content: string, user?: User): Promise<void>;
}
