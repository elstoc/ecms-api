import { User } from '../auth';
import { IGallery } from '../gallery';
import { IMarkdown } from '../markdown';
import { IMediaDb } from '../mediadb';
import { ComponentMetadata } from './ISiteComponent';

export type SiteConfig = {
    authEnabled: boolean;
    footerText: string;
};

export interface ISite {
    listComponents(user?: User): Promise<ComponentMetadata[]>;
    getGallery(apiPath: string): Promise<IGallery>;
    getMarkdown(apiPath: string): Promise<IMarkdown>;
    getMediaDb(apiPath: string): Promise<IMediaDb>;
    getConfig(): SiteConfig;
    shutdown(): Promise<void>;
}
