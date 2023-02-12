import fs from 'fs';
import path from 'path';
import { ISiteComponent, ComponentMetadata } from './ISiteComponent';
import { ISite } from './ISite';
import { SiteComponent } from './SiteComponent';
import { Config } from '../../utils';
import { GalleryData, ImageSize } from '../gallery';
import { Response } from 'express';
import { MarkdownStructure } from '../markdown/IMarkdownRecurse';

export class Site implements ISite {
    private config: Config;
    private componentCache: { [key: string]: ISiteComponent } = {};

    constructor(config: Config) {
        this.config = config;
        this.refreshComponentCache();
    }

    private refreshComponentCache(): void {
        this.getYamlFiles().forEach((file) => (
            this.getSiteComponent(path.basename(file, '.yaml')))
        );
    }

    private getYamlFiles(): string[] {
        const files = fs.readdirSync(this.config.contentDir);
        return files.filter((file) => file.endsWith('.yaml'));
    }

    private getSiteComponent(apiRootPath: string): ISiteComponent {
        this.componentCache[apiRootPath] ??= new SiteComponent(this.config, apiRootPath);
        return this.componentCache[apiRootPath];
    }

    public getComponentList(): ComponentMetadata[] {
        const componentList = this.getComponentListUnsorted();
        return componentList.sort((a, b) => {
            if (a.weight && !b.weight) return -1;
            if (b.weight && !a.weight) return 1;
            if (a.weight && b.weight) return a.weight - b.weight;
            if (a.title > b.title) return 1;
            if (a.title === b.title) return 0;
            return -1;
        });
    }

    private getComponentListUnsorted(): ComponentMetadata[] {
        return this.getYamlFiles().map((file) => (
            this.getComponentMetadata(path.basename(file, '.yaml')))
        );
    }

    private getComponentMetadata(apiRootPath: string): ComponentMetadata {
        const component = this.getSiteComponent(apiRootPath);
        return component.getMetadata();
    }

    public async getGalleryData(apiPath: string, limit?: number): Promise<GalleryData> {
        const gallery = this.getRootComponentFromPath(apiPath).getGallery();
        return gallery.getMetadata(limit);
    }

    public async getGalleryImagePath(apiPath: string, size: string): Promise<string> {
        const gallery = this.getRootComponentFromPath(apiPath).getGallery();
        return gallery.resizeImageAndGetPath(apiPath, size as ImageSize);
    }

    public async getMarkdownStructure(apiPath: string): Promise<MarkdownStructure> {
        const markdown = this.getRootComponentFromPath(apiPath).getMarkdown();
        return markdown.getStructure();
    }

    public sendMarkdownFile(apiPath: string, response: Response): void {
        const markdown = this.getRootComponentFromPath(apiPath).getMarkdown();
        return markdown.sendFile(apiPath, response);
    }

    private getRootComponentFromPath(apiPath: string): ISiteComponent {
        const rootPath = apiPath.replace(/^\//, '').split('/')[0];
        return this.getSiteComponent(rootPath);
    }
}
