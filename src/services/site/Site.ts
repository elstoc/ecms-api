import fs from 'fs';
import path from 'path';
import { SitePaths } from '..';
import { ISiteComponent, ComponentMetadata } from './ISiteComponent';
import { ISite } from './ISite';
import { SiteComponent } from './SiteComponent';

export class Site implements ISite {
    private componentCache: { [key: string]: ISiteComponent } = {};

    constructor(
        private paths: SitePaths,
    ) { }

    public getNavData(): ComponentMetadata[] {
        const files = fs.readdirSync(this.paths.getContentPath());
        return files.filter((file) => file.endsWith('.yaml'))
            .map((file) => this.getComponentMetadata(path.basename(file,'.yaml')));
    }

    private getComponentMetadata(apiPath: string): ComponentMetadata {
        const component = this.getSiteComponent(apiPath);
        return component.getMetadata();
    }

    private getSiteComponent(apiPath: string): ISiteComponent {
        this.componentCache[apiPath] ??= new SiteComponent(this.paths, apiPath);
        return this.componentCache[apiPath];
    }
}
