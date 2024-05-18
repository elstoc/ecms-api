import { User } from '../auth';
import { IGallery } from '../gallery';
import { IMarkdown } from '../markdown';
import { IVideoDb } from '../videodb';

export enum ComponentTypes {
    gallery = 'gallery',
    markdown = 'markdown',
    videodb = 'videodb'
}

export type ComponentMetadataCommon = {
    apiPath: string;
    uiPath: string;
    title: string;
    weight?: number;
    restrict?: string;
}

export type GalleryComponentMetadata = ComponentMetadataCommon & {
    type: ComponentTypes.gallery;
    marginPx: number;
    batchSize: number;
}

export type MarkdownComponentMetadata = ComponentMetadataCommon & {
    type: ComponentTypes.markdown;
    includeNav: boolean;
}

export type VideoDbComponentMetadata = ComponentMetadataCommon & {
    type: ComponentTypes.videodb;
}

export type ComponentMetadata = GalleryComponentMetadata | MarkdownComponentMetadata | VideoDbComponentMetadata;

export interface ISiteComponent {
    getMetadata(user?: User): Promise<ComponentMetadata | undefined>;
    getGallery(): Promise<IGallery>;
    getMarkdown(): Promise<IMarkdown>;
    getVideoDb(): Promise<IVideoDb>;
    shutdown(): Promise<void>;
}
