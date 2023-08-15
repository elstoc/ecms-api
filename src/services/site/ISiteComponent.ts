import { IGallery } from '../gallery';
import { IMarkdownRecurse } from '../markdown/IMarkdownRecurse';

export type AdditionalData = {
    [key: string]: boolean | number | string | undefined; 
};

export type ComponentMetadata = {
    type: string;
    apiPath: string;
    uiPath: string;
    title: string;
    weight?: number;
    restrict?: string;
    additionalData?: AdditionalData;
}

export interface ISiteComponent {
    getMetadata(): Promise<ComponentMetadata>;
    getGallery(): Promise<IGallery>;
    getMarkdown(): Promise<IMarkdownRecurse>;
}
