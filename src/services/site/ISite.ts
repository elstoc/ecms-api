import { User } from '../auth';
import { GalleryImages } from '../gallery/IGallery';
import { MarkdownTree } from '../markdown/IMarkdownTreeComponent';
import { ComponentMetadata } from './ISiteComponent';

export interface ISite {
    listComponents(user?: User): Promise<ComponentMetadata[]>;
    getGalleryImage(apiPath: string, size: string): Promise<Buffer>;
    getGalleryImages(apiPath: string, limit?: number): Promise<GalleryImages>;
    getMarkdownFile(apiPath: string, user?: User): Promise<Buffer>;
    writeMarkdownFile(apiPath: string, content: string, user?: User): Promise<void>;
    getMarkdownStructure(apiPath: string, user?: User): Promise<MarkdownTree | undefined>;
}
