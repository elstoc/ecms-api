import path from 'path';
import { ISiteComponent, ComponentMetadata } from './ISiteComponent';
import { ISite } from './ISite';
import { SiteComponent } from './SiteComponent';
import { Config, sortByWeightAndTitle } from '../../utils';
import { GalleryImages, ImageSize } from '../gallery';
import { MarkdownStructure } from '../markdown';
import { IStorageAdapter } from '../../adapters';
import { User } from '../auth';

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

    public async listComponents(user?: User): Promise<ComponentMetadata[]> {
        const componentPromises = (await this.listComponentYamlFiles()).map(async (file) => (
            this.getComponentMetadata(path.basename(file, '.yaml'), user)
        ));

        const components = (await Promise.all(componentPromises));

        return sortByWeightAndTitle(components as ComponentMetadata[]);
    }

    private async getComponentMetadata(apiRootPath: string, user?: User): Promise<ComponentMetadata | undefined> {
        const component = this.getComponent(apiRootPath);
        return component.getMetadata(user);
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
