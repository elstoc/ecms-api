import YAML from 'yaml';

import { Config } from '../../utils';
import { Gallery, IGallery } from '../gallery';
import { IMarkdownRecurse, MarkdownRecurse } from '../markdown';
import { ISiteComponent, ComponentMetadata } from './ISiteComponent';
import { IStorageAdapter } from '../../adapters';

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

    public async getMetadata(): Promise<ComponentMetadata> {
        this.throwIfNoContent();
        const sourceFileModifiedTime = this.storage.getContentFileModifiedTime(this.contentYamlPath);
        if (sourceFileModifiedTime === this.metadataFromSourceTime && this.metadata) {
            return this.metadata;
        }
        const yamlFileBuf = await this.storage.getContentFile(this.contentYamlPath);
        const parsedYaml = YAML.parse(yamlFileBuf.toString('utf-8'));
        if (!['gallery', 'markdown'].includes(parsedYaml?.type)) {
            throw new Error('Valid component type not found');
        }

        parsedYaml.apiPath = this.contentDir;
        parsedYaml.uiPath ??= this.contentDir;
        parsedYaml.title ??= this.contentDir;

        this.metadata = parsedYaml;
        this.metadataFromSourceTime = sourceFileModifiedTime;
        return parsedYaml;
    }

    private throwIfNoContent(): void {
        if (!this.storage.contentDirectoryExists(this.contentDir)) {
            throw new Error(`A content directory does not exist for the path ${this.contentDir}`);
        }
        if (!this.storage.contentFileExists(`${this.contentDir}.yaml`)) {
            throw new Error(`A yaml file does not exist for the path ${this.contentDir}`);
        }
    }

    public async getGallery(): Promise<IGallery> {
        await this.getMetadata();
        if (this.metadata?.type === 'gallery') {
            this.gallery ??= new Gallery(this.contentDir, this.config, this.storage);
            return this.gallery;
        } else {
            throw new Error(`No gallery component found at the path ${this.contentDir}`);
        }
    }

    public async getMarkdown(): Promise<IMarkdownRecurse> {
        await this.getMetadata();
        if (this.metadata?.type === 'markdown') {
            this.markdown ??= new MarkdownRecurse(this.contentDir, this.config, this.storage, true);
            return this.markdown;
        } else {
            throw new Error(`No markdown component found at the path ${this.contentDir}`);
        }
    }
}
