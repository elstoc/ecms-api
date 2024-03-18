import { User } from '../auth';
import { IGallery } from '../gallery';
import { IMarkdown } from '../markdown';
import { IVideoDb } from '../videodb';

export type AdditionalData = {
    [key: string]: boolean | number | string | undefined; 
};

export enum ComponentTypes {
    gallery = 'gallery',
    markdown = 'markdown',
    videodb = 'videodb'
}

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
    getMetadata(user?: User): Promise<ComponentMetadata | undefined>;
    getGallery(): Promise<IGallery>;
    getMarkdown(): Promise<IMarkdown>;
    getVideoDb(): Promise<IVideoDb>;
    shutdown(): Promise<void>;
}
