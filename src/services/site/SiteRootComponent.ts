import path from 'path';
import { ISiteComponent, ComponentMetadata } from './ISiteComponent';
import { ISiteRootComponent } from './ISiteRootComponent';
import { SiteComponent } from './SiteComponent';
import { Config, sortByWeightAndTitle } from '../../utils';
import { IGallery } from '../gallery';
import { IStorageAdapter } from '../../adapters';
import { User } from '../auth';
import { IMarkdown } from '../markdown/IMarkdown';
import { IVideoDb } from '../videodb';
import { Logger } from 'winston';

export class SiteRootComponent implements ISiteRootComponent {
    private components: { [key: string]: ISiteComponent } = {};

    constructor(
        private config: Config,
        private storage: IStorageAdapter,
        private logger: Logger
    ) { }

    private async listComponentYamlFiles(): Promise<string[]> {
        return this.storage.listContentChildren('', (file: string) => file.endsWith('.yaml'));
    }

    private getComponent(apiPath: string): ISiteComponent {
        this.components[apiPath] ??= new SiteComponent(this.config, apiPath, this.storage, this.logger);
        return this.components[apiPath];
    }

    public async listComponents(user?: User): Promise<ComponentMetadata[]> {
        this.logger.debug(`Site.listComponents(${user})`);
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
        this.logger.debug(`Site.getGallery(${apiPath})`);
        return await this.getComponentAtPath(apiPath).getGallery();
    }

    public async getMarkdown(apiPath: string): Promise<IMarkdown> {
        this.logger.debug(`Site.getMarkdown(${apiPath})`);
        return await this.getComponentAtPath(apiPath).getMarkdown();
    }

    public async getVideoDb(apiPath: string): Promise<IVideoDb> {
        this.logger.debug(`Site.getVideoDb(${apiPath})`);
        return await this.getComponentAtPath(apiPath).getVideoDb();
    }

    private getComponentAtPath(apiPath: string): ISiteComponent {
        const componentPath = apiPath.replace(/^\//, '').split('/')[0];
        return this.getComponent(componentPath);
    }

    public async shutdown(): Promise<void> {
        this.logger.debug('Site.shutdown()');
        for (const component of Object.values(this.components)) {
            await component.shutdown();
        }
    }
}
