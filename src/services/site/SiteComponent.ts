import YAML from 'yaml';
import _ from 'lodash';

import { Config } from '../../utils';
import { userHasReadAccess } from '../auth/accessUtils';
import { Gallery, IGallery } from '../gallery';
import { IMarkdown, Markdown } from '../markdown';
import { ISiteComponent, ComponentMetadata, ComponentTypes } from './ISiteComponent';
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

        const fieldList = ['type', 'apiPath', 'uiPath', 'title', 'weight', 'restrict'];
        const pickedFields = _.pick(parsedYaml, fieldList);
        const additionalData = _.omit(parsedYaml, fieldList);

        this.metadata = {
            type: parsedYaml.type,
            uiPath: this.contentDir,
            title: this.contentDir,
            ...pickedFields,
            apiPath: this.contentDir,
            additionalData
        };

        this.metadataFromSourceTime = sourceFileModifiedTime;
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
        this.gallery ??= new Gallery(this.contentDir, this.config, this.storage);
        return this.gallery;
    }

    public async getMarkdown(): Promise<IMarkdown> {
        await this.checkComponentExistsHere(ComponentTypes.markdown);
        this.markdown ??= new Markdown(this.contentDir, this.config, this.storage, true);
        return this.markdown;
    }

    public async getVideoDb(): Promise<IVideoDb> {
        await this.checkComponentExistsHere(ComponentTypes.videodb);
        this.videoDb ??= new VideoDb(this.contentDir, this.config, this.storage);
        await this.videoDb.initialise();
        return this.videoDb;
    }

    public async shutdown(): Promise<void> {
        await this.videoDb?.shutdown();
    }
}
