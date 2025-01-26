import YAML from 'yaml';

import { Config } from '../../utils';
import { userHasReadAccess } from '../auth/utils/access';
import { Gallery } from '../gallery';
import { Markdown } from '../markdown';
import { IComponent, ComponentTypes, ComponentMetadataCommon, ComponentMetadata } from './IComponent';
import { StorageAdapter } from '../../adapters';
import { NotFoundError } from '../../errors';
import { User } from '../auth';
import { IVideoDb, VideoDb } from '../videodb';
import { Logger } from 'winston';
import { ComponentGroup } from './ComponentGroup';

export class Component implements IComponent {
    private contentYamlPath: string;
    private gallery?: Gallery;
    private markdown?: Markdown;
    private videoDb?: IVideoDb;
    private componentGroup?: ComponentGroup;
    private metadataFromSourceTime = -1;
    private metadata?: ComponentMetadata;

    public constructor(
        private config: Config,
        private contentDir: string,
        private storage: StorageAdapter,
        private logger: Logger
    ) {
        this.contentYamlPath = contentDir + '.yaml';
    }

    public async getMetadata(user?: User): Promise<ComponentMetadata | undefined> {
        this.throwIfNoContent();
        await this.refreshMetadata();
        if (!this.metadata) {
            throw new Error('No metadata found');
        }
        if (this.config.enableAuthentication && !userHasReadAccess(user, this.metadata.restrict)) {
            return undefined;
        }
        if (this.metadata.type === ComponentTypes.componentgroup) {
            this.componentGroup ??= new ComponentGroup(this.config, this.storage, this.logger, this.metadata.apiPath);
            const components = await this.componentGroup.list(user);
            return {
                ...this.metadata,
                components
            };
        }
        return this.metadata;
    }

    private async refreshMetadata(): Promise<void> {
        const sourceFileModifiedTime = this.storage.getContentFileModifiedTime(this.contentYamlPath);
        if (sourceFileModifiedTime === this.metadataFromSourceTime && this.metadata) {
            return;
        }
        const yamlFileBuf = await this.storage.getContentFile(this.contentYamlPath);
        const parsedYaml = YAML.parse(yamlFileBuf.toString('utf-8'));
        if (!(parsedYaml?.type in ComponentTypes)) {
            throw new NotFoundError('Valid component type not found');
        }

        this.metadata = await this.getComponentMetadata(parsedYaml);
        this.metadataFromSourceTime = sourceFileModifiedTime;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async getComponentMetadata(parsedYaml: any): Promise<ComponentMetadata> {
        const { type } = parsedYaml;
        if (!(type in ComponentTypes)) {
            throw new NotFoundError('Valid component type not found');
        }

        const commonMetadata = this.getCommonMetadata(parsedYaml);

        if (type === ComponentTypes.markdown) {
            const { singlePage, defaultComponent } = parsedYaml;
            return {
                type,
                singlePage: singlePage === true,
                defaultComponent: defaultComponent === true,
                ...commonMetadata
            };
        } else if (type === ComponentTypes.videodb || type === ComponentTypes.gallery) {
            const { defaultComponent } = parsedYaml;
            return {
                type,
                defaultComponent: defaultComponent === true,
                ...commonMetadata
            };
        } else if (type === ComponentTypes.componentgroup) {
            return {
                type,
                defaultComponent: false,
                ...commonMetadata
            };
        }

        return {
            type,
            ...commonMetadata
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private getCommonMetadata(parsedYaml: any): ComponentMetadataCommon {
        if (parsedYaml.weight && typeof parsedYaml.weight !== 'number') {
            throw new Error('Component weight must be numeric');
        }
        return {
            apiPath: this.contentDir,
            uiPath: parsedYaml?.defaultComponent ? '' : this.contentDir,
            title: parsedYaml?.title ?? this.contentDir,
            weight: parsedYaml.weight,
            restrict: parsedYaml.restrict
        };
    }

    private throwIfNoContent(): void {
        if (!this.storage.contentDirectoryExists(this.contentDir)) {
            throw new NotFoundError(`A content directory does not exist for the path ${this.contentDir}`);
        }
        if (!this.storage.contentFileExists(`${this.contentDir}.yaml`)) {
            throw new NotFoundError(`A yaml file does not exist for the path ${this.contentDir}`);
        }
    }

    public async getGallery(apiPath: string): Promise<Gallery> {
        await this.getMetadata();
        if (this.metadata?.type === ComponentTypes.componentgroup) {
            this.componentGroup ??= new ComponentGroup(this.config, this.storage, this.logger, this.contentDir);
            return this.componentGroup.getGallery(apiPath);
        }
        if (this.metadata?.type !== ComponentTypes.gallery) {
            throw new NotFoundError(`No ${ComponentTypes.gallery} component found at the path ${this.contentDir}`);
        }
        this.gallery ??= new Gallery(this.contentDir, this.config, this.storage, this.logger);
        return this.gallery;
    }

    public async getMarkdown(apiPath: string): Promise<Markdown> {
        await this.getMetadata();
        if (this.metadata?.type === ComponentTypes.componentgroup) {
            this.componentGroup ??= new ComponentGroup(this.config, this.storage, this.logger, this.contentDir);
            return this.componentGroup.getMarkdown(apiPath);
        }
        if (this.metadata?.type !== ComponentTypes.markdown) {
            throw new NotFoundError(`No ${ComponentTypes.markdown} component found at the path ${this.contentDir}`);
        }
        this.markdown ??= new Markdown(this.contentDir, '', this.config, this.storage, this.logger, true, this.metadata.singlePage);
        return this.markdown;
    }

    public async getVideoDb(apiPath: string): Promise<IVideoDb> {
        await this.getMetadata();
        if (this.metadata?.type === ComponentTypes.componentgroup) {
            this.componentGroup ??= new ComponentGroup(this.config, this.storage, this.logger, this.contentDir);
            return this.componentGroup.getVideoDb(apiPath);
        }
        if (this.metadata?.type !== ComponentTypes.videodb) {
            throw new NotFoundError(`No ${ComponentTypes.videodb} component found at the path ${this.contentDir}`);
        }
        this.videoDb ??= new VideoDb(this.contentDir, this.config, this.logger, this.storage);
        await this.videoDb.initialise();
        return this.videoDb;
    }

    public async shutdown(): Promise<void> {
        await this.videoDb?.shutdown();
        await this?.componentGroup?.shutdown();
    }
}
