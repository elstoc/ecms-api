import path from 'path';
import { IComponent, ComponentMetadata } from './IComponent';
import { IComponentGroup } from './IComponentGroup';
import { Component } from './Component';
import { Config, sortByWeightAndTitle } from '../../utils';
import { IGallery } from '../gallery';
import { StorageAdapter } from '../../adapters';
import { User } from '../auth';
import { IMarkdown } from '../markdown/IMarkdown';
import { IVideoDb } from '../videodb';
import { Logger } from 'winston';

export class ComponentGroup implements IComponentGroup {
    private components: { [key: string]: IComponent } = {};

    constructor(
        private config: Config,
        private storage: StorageAdapter,
        private logger: Logger,
        private parentPath: string
    ) { }

    public async list(user?: User): Promise<ComponentMetadata[]> {
        this.logger.debug(`Site.listComponents(${user})`);
        const componentPromises = (await this.listComponentYamlFiles()).map(async (file) => (
            this.getComponentMetadata(path.join(this.parentPath, path.basename(file, '.yaml')), user)
        ));

        const components = (await Promise.all(componentPromises));

        return sortByWeightAndTitle(components as ComponentMetadata[]);
    }

    private async listComponentYamlFiles(): Promise<string[]> {
        return this.storage.listContentChildren(this.parentPath, (file: string) => file.endsWith('.yaml'));
    }

    private async getComponentMetadata(apiRootPath: string, user?: User): Promise<ComponentMetadata | undefined> {
        const component = this.getComponent(apiRootPath);
        return component.getMetadata(user);
    }

    private getComponent(apiPath: string): IComponent {
        this.components[apiPath] ??= new Component(this.config, apiPath, this.storage, this.logger);
        return this.components[apiPath];
    }

    public async getGallery(apiPath: string): Promise<IGallery> {
        this.logger.debug(`Site.getGallery(${apiPath})`);
        return await this.getComponentAtPath(apiPath).getGallery(apiPath);
    }

    private getComponentAtPath(apiPath: string): IComponent {
        const baseDirOfComponent = apiPath.replace(this.parentPath, '')
            .replace(/^\//, '')
            .split('/')[0];
        const componentPath = path.join(this.parentPath, baseDirOfComponent);
        return this.getComponent(componentPath);
    }

    public async getMarkdown(apiPath: string): Promise<IMarkdown> {
        this.logger.debug(`Site.getMarkdown(${apiPath})`);
        return await this.getComponentAtPath(apiPath).getMarkdown(apiPath);
    }

    public async getVideoDb(apiPath: string): Promise<IVideoDb> {
        this.logger.debug(`Site.getVideoDb(${apiPath})`);
        return await this.getComponentAtPath(apiPath).getVideoDb(apiPath);
    }

    public async shutdown(): Promise<void> {
        this.logger.debug('Site.shutdown()');
        for (const component of Object.values(this.components)) {
            await component.shutdown();
        }
    }
}
