import { Logger } from 'winston';
import { IStorageAdapter } from '../../adapters';
import { Config } from '../../utils';
import { ISite, SiteConfig } from './ISite';
import { SiteRootComponent } from './SiteRootComponent';
import { User } from '../auth';
import { ComponentMetadata } from './IComponent';
import { IGallery } from '../gallery';
import { IMarkdown } from '../markdown';
import { IVideoDb } from '../videodb';

export class Site implements ISite {
    private rootComponent: SiteRootComponent;

    constructor(
        private config: Config,
        storage: IStorageAdapter,
        private logger: Logger
    ) {
        this.rootComponent = new SiteRootComponent(config, storage, logger);
    }

    public async listComponents(user?: User): Promise<ComponentMetadata[]> {
        return await this.rootComponent.listComponents(user);
    }

    public async getGallery(apiPath: string): Promise<IGallery> {
        return await this.rootComponent.getGallery(apiPath);
    }

    public async getMarkdown(apiPath: string): Promise<IMarkdown> {
        return await this.rootComponent.getMarkdown(apiPath);
    }

    public async getVideoDb(apiPath: string): Promise<IVideoDb> {
        return await this.rootComponent.getVideoDb(apiPath);
    }

    public getConfig(): SiteConfig {
        this.logger.debug('Site.getConfig()');
        return {
            authEnabled: this.config.enableAuthentication,
            footerText: this.config.footerText
        };
    }

    public async shutdown(): Promise<void> {
        this.logger.debug('Site.shutdown()');
        return await this.rootComponent.shutdown();
    }
}
