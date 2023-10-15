import { User } from '../auth';
import { GalleryContents } from '../gallery/IGallery';
import { MarkdownPage, MarkdownTree } from '../markdown/IMarkdown';
import { ComponentMetadata } from './ISiteComponent';

export type SiteConfig = {
    authEnabled: boolean;
    footerText: string;
};

export interface ISite {
    listComponents(user?: User): Promise<ComponentMetadata[]>;
    getGalleryImageFile(apiPath: string, size: string): Promise<Buffer>;
    getGalleryContents(apiPath: string, limit?: number): Promise<GalleryContents>;
    getMarkdownPage(apiPath: string, user?: User): Promise<MarkdownPage>;
    writeMarkdownPage(apiPath: string, content: string, user?: User): Promise<void>;
    getMarkdownTree(apiPath: string, user?: User): Promise<MarkdownTree | undefined>;
    getConfig(): SiteConfig;
}
