import { User } from '../auth';
import { GalleryContents, IGallery } from '../gallery/IGallery';
import { IMarkdown, MarkdownPage, MarkdownTree } from '../markdown/IMarkdown';
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

    getGalleryImageFile(apiPath: string, size: string, timestamp: string): Promise<Buffer>;
    getGalleryContents(apiPath: string, limit?: number): Promise<GalleryContents>;
    getMarkdownPage(apiPath: string, user?: User): Promise<MarkdownPage>;
    writeMarkdownPage(apiPath: string, content: string, user?: User): Promise<void>;
    deleteMarkdownPage(apiPath: string, user?: User): Promise<void>;
    getMarkdownTree(apiPath: string, user?: User): Promise<MarkdownTree | undefined>;
    getMediaDbVersion(apiPath: string): Promise<number>;
}
