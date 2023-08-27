import { User } from '../auth';
import { GalleryImages } from '../gallery/IGallery';
import { MarkdownStructure } from '../markdown/IMarkdownRecurse';
import { ComponentMetadata } from './ISiteComponent';

export interface ISite {
    listComponents(user?: User): Promise<ComponentMetadata[]>;
    getGalleryImage(apiPath: string, size: string): Promise<Buffer>;
    getGalleryImages(apiPath: string, limit?: number): Promise<GalleryImages>;
    getMarkdownFile(apiPath: string): Promise<Buffer>;
    getMarkdownStructure(apiPath: string): Promise<MarkdownStructure>;
}
