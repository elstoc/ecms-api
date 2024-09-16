import { User } from '../auth';
import { IGallery } from '../gallery';
import { IMarkdown } from '../markdown';
import { IVideoDb } from '../videodb';
import { ComponentMetadata } from './IComponent';

export type SiteConfig = {
    authEnabled: boolean;
    footerText: string;
    siteTitle: string;
};

export interface ISite {
    listComponents(user?: User): Promise<ComponentMetadata[]>;
    getGallery(apiPath: string): Promise<IGallery>;
    getMarkdown(apiPath: string): Promise<IMarkdown>;
    getVideoDb(apiPath: string): Promise<IVideoDb>;
    getConfig(): SiteConfig;
    shutdown(): Promise<void>;
}
