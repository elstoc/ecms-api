import { Logger } from 'winston';
import { StorageAdapter } from '../../adapters';
import { Config } from '../../utils';
import { ComponentGroup } from './ComponentGroup';
import { User } from '../auth';
import { ComponentMetadata } from './Component';
import { Gallery } from '../gallery';
import { Markdown } from '../markdown';
import { IVideoDb } from '../videodb';

export type SiteConfig = {
    authEnabled: boolean;
    footerText: string;
    siteTitle: string;
};

export class Site {
    private components: ComponentGroup;

    constructor(
        private config: Config,
        storage: StorageAdapter,
        private logger: Logger
    ) {
        this.components = new ComponentGroup(config, storage, logger, '');
    }

    public async listComponents(user?: User): Promise<ComponentMetadata[]> {
        return await this.components.list(user);
    }

    public async getGallery(apiPath: string): Promise<Gallery> {
        return await this.components.getGallery(apiPath);
    }

    public async getMarkdown(apiPath: string): Promise<Markdown> {
        return await this.components.getMarkdown(apiPath);
    }

    public async getVideoDb(apiPath: string): Promise<IVideoDb> {
        return await this.components.getVideoDb(apiPath);
    }

    public getConfig(): SiteConfig {
        this.logger.debug('Site.getConfig()');
        return {
            authEnabled: this.config.enableAuthentication,
            footerText: this.config.footerText,
            siteTitle: this.config.siteTitle
        };
    }

    public async shutdown(): Promise<void> {
        this.logger.debug('Site.shutdown()');
        return await this.components.shutdown();
    }
}
