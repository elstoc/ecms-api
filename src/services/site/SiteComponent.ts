import YAML from 'yaml';
import _ from 'lodash';

import { Config, userHasReadAccess } from '../../utils';
import { Gallery, IGallery } from '../gallery';
import { IMarkdownRecurse, MarkdownRecurse } from '../markdown';
import { ISiteComponent, ComponentMetadata } from './ISiteComponent';
import { IStorageAdapter } from '../../adapters';
import { NotFoundError } from '../../errors';
import { User } from '../auth';

export class SiteComponent implements ISiteComponent {
    private contentYamlPath: string;
    private gallery?: IGallery;
    private markdown?: IMarkdownRecurse;
    private metadataFromSourceTime = -1;
    private metadata?: ComponentMetadata;

    public constructor(
        private config: Config,
        private contentDir: string,
        private storage: IStorageAdapter
    ) {
        this.contentYamlPath = contentDir + '.yaml';
    }

    public async getMetadata(user?: User): Promise<ComponentMetadata | undefined> {
        this.throwIfNoContent();
        await this.refreshMetadata();
        if (!this.metadata) {
            throw new Error('No metadata found');
        }
        if (!userHasReadAccess(user, this.metadata.restrict)) {
            return undefined;
        }
        return (this.metadata);
    }

    private async refreshMetadata(): Promise<void> {
        const sourceFileModifiedTime = this.storage.getContentFileModifiedTime(this.contentYamlPath);
        if (sourceFileModifiedTime === this.metadataFromSourceTime && this.metadata) {
            return;
        }
        const yamlFileBuf = await this.storage.getContentFile(this.contentYamlPath);
        const parsedYaml = YAML.parse(yamlFileBuf.toString('utf-8'));
        if (!['gallery', 'markdown'].includes(parsedYaml?.type)) {
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

    public async getGallery(): Promise<IGallery> {
        await this.getMetadata();
        if (this.metadata?.type === 'gallery') {
            this.gallery ??= new Gallery(this.contentDir, this.config, this.storage);
            return this.gallery;
        } else {
            throw new NotFoundError(`No gallery component found at the path ${this.contentDir}`);
        }
    }

    public async getMarkdown(): Promise<IMarkdownRecurse> {
        await this.getMetadata();
        if (this.metadata?.type === 'markdown') {
            this.markdown ??= new MarkdownRecurse(this.contentDir, this.config, this.storage, true);
            return this.markdown;
        } else {
            throw new NotFoundError(`No markdown component found at the path ${this.contentDir}`);
        }
    }
}
