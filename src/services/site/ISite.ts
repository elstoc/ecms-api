import { Response } from 'express';
import { GalleryImages } from '../gallery/IGallery';
import { MarkdownStructure } from '../markdown/IMarkdownRecurse';
import { ComponentMetadata } from './ISiteComponent';

export interface ISite {
    listComponents(): Promise<ComponentMetadata[]>;
    sendGalleryImage(apiPath: string, size: string, response: Response): Promise<void>;
    getGalleryImages(apiPath: string, limit?: number): Promise<GalleryImages>;
    sendMarkdownFile(apiPath: string, response: Response): Promise<void>;
    getMarkdownStructure(apiPath: string): Promise<MarkdownStructure>;
}
