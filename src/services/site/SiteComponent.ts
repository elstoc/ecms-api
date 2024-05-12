import YAML from 'yaml';

import { Config } from '../../utils';
import { userHasReadAccess } from '../auth/accessUtils';
import { Gallery, IGallery } from '../gallery';
import { IMarkdown, Markdown } from '../markdown';
import { ISiteComponent, ComponentTypes, ComponentMetadataCommon, ComponentMetadata } from './ISiteComponent';
import { IStorageAdapter } from '../../adapters';
import { NotFoundError } from '../../errors';
import { User } from '../auth';
import { IVideoDb, VideoDb } from '../videodb';
import { Logger } from 'winston';

export class SiteComponent implements ISiteComponent {
    private contentYamlPath: string;
    private gallery?: IGallery;
    private markdown?: IMarkdown;
    private videoDb?: IVideoDb;
    private metadataFromSourceTime = -1;
    private metadata?: ComponentMetadata;

    public constructor(
        private config: Config,
        private contentDir: string,
        private storage: IStorageAdapter,
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

        this.metadata = this.getComponentMetadata(parsedYaml);
        this.metadataFromSourceTime = sourceFileModifiedTime;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private getComponentMetadata(parsedYaml: any): ComponentMetadata {
        const { type } = parsedYaml;
        if (!(type in ComponentTypes)) {
            throw new NotFoundError('Valid component type not found');
        }

        const commonMetadata = this.getCommonMetadata(parsedYaml);

        if (type === ComponentTypes.gallery) {
            const { marginPx, batchSize, threshold } = parsedYaml;
            if (typeof marginPx !== 'number' || typeof batchSize !== 'number' || typeof threshold !== 'number') {
                throw new Error('Gallery components must include marginPx, batchSize and threshold as numbers');
            }
            return {
                type, marginPx, batchSize, threshold,
                ...commonMetadata
            };
        } else if (type === ComponentTypes.markdown) {
            const { includeNav } = parsedYaml;
            if (typeof includeNav !== 'boolean') {
                throw new Error('Markdown components must include the includeNav parameter as a boolean');
            }
            return {
                type, includeNav,
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
            uiPath: parsedYaml?.uiPath ?? this.contentDir,
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

    private async checkComponentExistsHere(type: ComponentTypes): Promise<void> {
        await this.getMetadata();
        if (this.metadata?.type !== type) {
            throw new NotFoundError(`No ${type} component found at the path ${this.contentDir}`);
        }
    }

    public async getGallery(): Promise<IGallery> {
        await this.checkComponentExistsHere(ComponentTypes.gallery);
        this.gallery ??= new Gallery(this.contentDir, this.config, this.storage, this.logger);
        return this.gallery;
    }

    public async getMarkdown(): Promise<IMarkdown> {
        await this.checkComponentExistsHere(ComponentTypes.markdown);
        this.markdown ??= new Markdown(this.contentDir, this.config, this.storage, this.logger, true);
        return this.markdown;
    }

    public async getVideoDb(): Promise<IVideoDb> {
        await this.checkComponentExistsHere(ComponentTypes.videodb);
        this.videoDb ??= new VideoDb(this.contentDir, this.config, this.logger, this.storage);
        await this.videoDb.initialise();
        return this.videoDb;
    }

    public async shutdown(): Promise<void> {
        await this.videoDb?.shutdown();
    }
}
