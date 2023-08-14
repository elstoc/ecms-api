import path from 'path';
import { ISiteComponent, ComponentMetadata } from './ISiteComponent';
import { ISite } from './ISite';
import { SiteComponent } from './SiteComponent';
import { Config } from '../../utils';
import { GalleryImages, ImageSize } from '../gallery';
import { MarkdownStructure } from '../markdown';
import { IStorageAdapter } from '../../adapters';

export class Site implements ISite {
    private components: { [key: string]: ISiteComponent } = {};

    constructor(
        private config: Config,
        private storage: IStorageAdapter
    ) { }

    private async listComponentYamlFiles(): Promise<string[]> {
        return this.storage.listContentChildren('', (file: string) => file.endsWith('.yaml'));
    }

    private getComponent(apiPath: string): ISiteComponent {
        this.components[apiPath] ??= new SiteComponent(this.config, apiPath, this.storage);
        return this.components[apiPath];
    }

    public async listComponents(): Promise<ComponentMetadata[]> {
        const componentPromises = (await this.listComponentYamlFiles()).map((file) => (
            this.getComponentMetadata(path.basename(file, '.yaml')))
        );

        const components = await Promise.all(componentPromises);

        return components.sort((a, b) => {
            if (a.weight && !b.weight) return -1;
            if (b.weight && !a.weight) return 1;
            if (a.weight && b.weight) return a.weight - b.weight;
            if (a.title > b.title) return 1;
            if (a.title === b.title) return 0;
            return -1;
        });
    }

    private async getComponentMetadata(apiRootPath: string): Promise<ComponentMetadata> {
        const component = this.getComponent(apiRootPath);
        return component.getMetadata();
    }

    public async getGalleryImages(apiPath: string, limit?: number): Promise<GalleryImages> {
        const gallery = await this.getRootComponent(apiPath).getGallery();
        return gallery.getImages(limit);
    }

    public async getGalleryImage(apiPath: string, size: string): Promise<Buffer> {
        const gallery = await this.getRootComponent(apiPath).getGallery();
        return gallery.getImageFile(apiPath, size as ImageSize);
    }

    public async getMarkdownStructure(apiPath: string): Promise<MarkdownStructure> {
        const markdown = await this.getRootComponent(apiPath).getMarkdown();
        return markdown.getMdStructure();
    }

    public async getMarkdownFile(apiPath: string): Promise<Buffer> {
        const markdown = await this.getRootComponent(apiPath).getMarkdown();
        return markdown.getFile(apiPath);
    }

    private getRootComponent(apiPath: string): ISiteComponent {
        const rootPath = apiPath.replace(/^\//, '').split('/')[0];
        return this.getComponent(rootPath);
    }
}
