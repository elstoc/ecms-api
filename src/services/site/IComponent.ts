import { User } from '../auth';
import { IGallery } from '../gallery';
import { IMarkdown } from '../markdown';
import { IVideoDb } from '../videodb';

export enum ComponentTypes {
    gallery = 'gallery',
    markdown = 'markdown',
    videodb = 'videodb',
    componentgroup = 'componentgroup'
}

export type ComponentMetadataCommon = {
    apiPath: string;
    uiPath: string;
    title: string;
    weight?: number;
    restrict?: string;
}

export type GalleryMetadata = ComponentMetadataCommon & {
    type: ComponentTypes.gallery;
    defaultComponent?: boolean;
}

export type MarkdownMetadata = ComponentMetadataCommon & {
    type: ComponentTypes.markdown;
    singlePage: boolean;
    defaultComponent?: boolean;
}

export type VideoDbMetadata = ComponentMetadataCommon & {
    type: ComponentTypes.videodb;
    defaultComponent?: boolean;
}

export type ComponentGroupMetadata = ComponentMetadataCommon & {
    type: ComponentTypes.componentgroup;
    components: ComponentMetadata[];
    defaultComponent: false;
}

export type ComponentMetadata = GalleryMetadata | MarkdownMetadata | VideoDbMetadata | ComponentGroupMetadata;

export interface IComponent {
    getMetadata(user?: User): Promise<ComponentMetadata | undefined>;
    getGallery(apiPath: string): Promise<IGallery>;
    getMarkdown(apiPath: string): Promise<IMarkdown>;
    getVideoDb(apiPath: string): Promise<IVideoDb>;
    shutdown(): Promise<void>;
}
