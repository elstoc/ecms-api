import { Response } from 'express';
import { GalleryData } from '../gallery/IGallery';
import { MarkdownStructure } from '../markdown/IMarkdownRecurse';
import { ComponentMetadata } from './ISiteComponent';

export interface ISite {
    listComponents(): ComponentMetadata[];
    sendGalleryImage(apiPath: string, size: string, response: Response): Promise<void>;
    getGalleryData(apiPath: string, limit?: number): Promise<GalleryData>;
    sendMarkdownFile(apiPath: string, response: Response): void;
    getMarkdownStructure(apiPath: string): Promise<MarkdownStructure>;
}
