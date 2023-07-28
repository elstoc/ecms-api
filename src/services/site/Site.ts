import fs from 'fs';
import path from 'path';
import { ISiteComponent, ComponentMetadata } from './ISiteComponent';
import { ISite } from './ISite';
import { SiteComponent } from './SiteComponent';
import { Config } from '../../utils';
import { GalleryImages, ImageSize } from '../gallery';
import { Response } from 'express';
import { MarkdownStructure } from '../markdown/IMarkdownRecurse';
import { IStorageAdapter } from '../../adapters/IStorageAdapter';

export class Site implements ISite {
    private components: { [key: string]: ISiteComponent } = {};

    constructor(
        private config: Config,
        private storage: IStorageAdapter
    ) {
        this.refreshComponents();
    }

    private refreshComponents(): void {
        this.listComponentYamlFiles().forEach((file) => (
            this.getComponent(path.basename(file, '.yaml')))
        );
    }

    private listComponentYamlFiles(): string[] {
        const files = fs.readdirSync(path.join(this.config.dataDir, 'content'));
        return files.filter((file) => file.endsWith('.yaml'));
    }

    private getComponent(apiPath: string): ISiteComponent {
        this.components[apiPath] ??= new SiteComponent(this.config, apiPath, this.storage);
        return this.components[apiPath];
    }

    public listComponents(): ComponentMetadata[] {
        const components = this.listComponentYamlFiles().map((file) => (
            this.getComponentMetadata(path.basename(file, '.yaml')))
        );

        return components.sort((a, b) => {
            if (a.weight && !b.weight) return -1;
            if (b.weight && !a.weight) return 1;
            if (a.weight && b.weight) return a.weight - b.weight;
            if (a.title > b.title) return 1;
            if (a.title === b.title) return 0;
            return -1;
        });
    }

    private getComponentMetadata(apiRootPath: string): ComponentMetadata {
        const component = this.getComponent(apiRootPath);
        return component.getMetadata();
    }

    public async getGalleryImages(apiPath: string, limit?: number): Promise<GalleryImages> {
        const gallery = this.getRootComponent(apiPath).getGallery();
        return gallery.getImages(limit);
    }

    public async sendGalleryImage(apiPath: string, size: string, response: Response): Promise<void> {
        const gallery = this.getRootComponent(apiPath).getGallery();
        await gallery.sendImageFile(apiPath, size as ImageSize, response);
    }

    public async getMarkdownStructure(apiPath: string): Promise<MarkdownStructure> {
        const markdown = this.getRootComponent(apiPath).getMarkdown();
        return markdown.getStructure();
    }

    public sendMarkdownFile(apiPath: string, response: Response): void {
        const markdown = this.getRootComponent(apiPath).getMarkdown();
        return markdown.sendFile(apiPath, response);
    }

    private getRootComponent(apiPath: string): ISiteComponent {
        const rootPath = apiPath.replace(/^\//, '').split('/')[0];
        return this.getComponent(rootPath);
    }
}
