import { Logger } from 'winston';
import { IStorageAdapter } from '../../adapters';
import { Config } from '../../utils';
import { ISite, SiteConfig } from './ISite';
import { ComponentGroup } from './ComponentGroup';
import { User } from '../auth';
import { ComponentMetadata } from './IComponent';
import { IGallery } from '../gallery';
import { IMarkdown } from '../markdown';
import { IVideoDb } from '../videodb';

export class Site implements ISite {
    private componentGroup: ComponentGroup;

    constructor(
        private config: Config,
        storage: IStorageAdapter,
        private logger: Logger
    ) {
        this.componentGroup = new ComponentGroup(config, storage, logger);
    }

    public async listComponents(user?: User): Promise<ComponentMetadata[]> {
        return await this.componentGroup.list(user);
    }

    public async getGallery(apiPath: string): Promise<IGallery> {
        return await this.componentGroup.getGallery(apiPath);
    }

    public async getMarkdown(apiPath: string): Promise<IMarkdown> {
        return await this.componentGroup.getMarkdown(apiPath);
    }

    public async getVideoDb(apiPath: string): Promise<IVideoDb> {
        return await this.componentGroup.getVideoDb(apiPath);
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
        return await this.componentGroup.shutdown();
    }
}
