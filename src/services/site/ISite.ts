import { User } from '../auth';
import { GalleryContents } from '../gallery/IGallery';
import { MarkdownTree } from '../markdown/IMarkdown';
import { ComponentMetadata } from './ISiteComponent';

export interface ISite {
    listComponents(user?: User): Promise<ComponentMetadata[]>;
    getGalleryImageFile(apiPath: string, size: string): Promise<Buffer>;
    getGalleryContents(apiPath: string, limit?: number): Promise<GalleryContents>;
    getMarkdownFile(apiPath: string, user?: User): Promise<Buffer>;
    writeMarkdownFile(apiPath: string, content: string, user?: User): Promise<void>;
    getMarkdownTree(apiPath: string, user?: User): Promise<MarkdownTree | undefined>;
}
