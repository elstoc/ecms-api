import { User } from '../auth';
import { IGallery } from '../gallery';
import { IMarkdown } from '../markdown';
import { IVideoDb } from '../videodb';
import { ComponentMetadata } from './IComponent';

export interface ISiteRootComponent {
    listComponents(user?: User): Promise<ComponentMetadata[]>;
    getGallery(apiPath: string): Promise<IGallery>;
    getMarkdown(apiPath: string): Promise<IMarkdown>;
    getVideoDb(apiPath: string): Promise<IVideoDb>;
    shutdown(): Promise<void>;
}
