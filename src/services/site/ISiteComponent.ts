import { IGallery } from '../gallery';
import { IMarkdownRecurse } from '../markdown/IMarkdownRecurse';

export type ComponentMetadata = {
    apiPath: string;
    uiPath: string;
    title: string;
    type: string;
    weight?: number;
    restrict?: string;
    [key: string]: boolean | number | string | undefined;
}

export interface ISiteComponent {
    getMetadata(): Promise<ComponentMetadata>;
    getGallery(): Promise<IGallery>;
    getMarkdown(): Promise<IMarkdownRecurse>;
}
