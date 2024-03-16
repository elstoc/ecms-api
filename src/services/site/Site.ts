import path from 'path';
import { ISiteComponent, ComponentMetadata, ComponentTypes } from './ISiteComponent';
import { ISite, SiteConfig } from './ISite';
import { SiteComponent } from './SiteComponent';
import { Config, sortByWeightAndTitle } from '../../utils';
import { GalleryContents, IGallery, ImageSize } from '../gallery';
import { MarkdownTree } from '../markdown';
import { IStorageAdapter } from '../../adapters';
import { User } from '../auth';
import { NotPermittedError } from '../../errors';
import { IMarkdown, MarkdownPage } from '../markdown/IMarkdown';
import { IMediaDb } from '../mediadb';

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

    public async getGallery(apiPath: string): Promise<IGallery> {
        return await this.getRootComponent(apiPath).getGallery();
    }

    public async getMarkdown(apiPath: string): Promise<IMarkdown> {
        return await this.getRootComponent(apiPath).getMarkdown();
    }

    public async getMediaDb(apiPath: string): Promise<IMediaDb> {
        return await this.getRootComponent(apiPath).getMediaDb();
    }

    public async getGalleryContents(apiPath: string, limit?: number): Promise<GalleryContents> {
        const gallery = await this.getRootComponent(apiPath).getGallery();
        return gallery.getContents(limit);
    }

    public async getGalleryImageFile(apiPath: string, size: string, timestamp: string): Promise<Buffer> {
        const gallery = await this.getRootComponent(apiPath).getGallery();
        return gallery.getImageFile(apiPath, size as ImageSize, timestamp);
    }

    public async getMarkdownTree(apiPath: string, user?: User): Promise<MarkdownTree | undefined> {
        const markdown = await this.getRootComponent(apiPath).getMarkdown();
        const structure = await markdown.getTree(user);
        if (!structure) {
            throw new NotPermittedError();
        }
        return structure;
    }

    public async getMarkdownPage(apiPath: string, user?: User): Promise<MarkdownPage> {
        const markdown = await this.getRootComponent(apiPath).getMarkdown();
        return markdown.getPage(apiPath, user);
    }

    public async writeMarkdownPage(apiPath: string, content: string, user?: User): Promise<void> {
        const markdown = await this.getRootComponent(apiPath).getMarkdown();
        return markdown.writePage(apiPath, content, user);
    }

    public async deleteMarkdownPage(apiPath: string, user?: User): Promise<void> {
        const markdown = await this.getRootComponent(apiPath).getMarkdown();
        return markdown.deletePage(apiPath, user);
    }

    public async getMediaDbVersion(apiPath: string): Promise<number> {
        const mediaDb = await this.getRootComponent(apiPath).getMediaDb();
        return mediaDb.getVersion();
    }

    private getRootComponent(apiPath: string): ISiteComponent {
        const rootPath = apiPath.replace(/^\//, '').split('/')[0];
        return this.getComponent(rootPath);
    }

    public getConfig(): SiteConfig {
        return {
            authEnabled: this.config.enableAuthentication,
            footerText: this.config.footerText
        };
    }

    public async shutdown(): Promise<void> {
        for (const component of Object.values(this.components)) {
            await component.shutdown();
        }
    }
}
