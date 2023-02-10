import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { Config, pathIsDirectory, pathIsFile, pathModifiedTime } from '../../utils';
import { Gallery, IGallery } from '../gallery';
import { IMarkdownRecurse } from '../markdown/IMarkdownRecurse';
import { MarkdownRecurse } from '../markdown/MarkdownRecurse';

import { ISiteComponent, ComponentMetadata } from './ISiteComponent';

export class SiteComponent implements ISiteComponent {
    private config: Config;
    private gallery?: IGallery;
    private markdown?: IMarkdownRecurse;
    private apiPath: string;
    private sourceFileModifiedTimeForCache = 0;
    private metadata?: ComponentMetadata;

    public constructor(config: Config, apiPath: string) {
        this.config = config;
        this.apiPath = apiPath;
        if (!pathIsDirectory(path.join(this.config.contentDir, apiPath))) {
            throw new Error(`A content directory does not exist for the path ${this.apiPath}`);
        }
        if (!pathIsFile(this.getContentPath())) {
            throw new Error(`A yaml file does not exist for the path ${this.apiPath}`);
        }
        this.refreshMetadata();
        if (this.metadata?.type === 'gallery') {
            this.gallery = new Gallery(this.apiPath, this.config);
        } else if (this.metadata?.type === 'markdown') {
            this.markdown = new MarkdownRecurse(this.apiPath, this.config, true);
        }
    }

    private clearCacheIfOutdated(): void {
        const sourceFileModifiedTime = this.getFileModifiedTime();
        if (sourceFileModifiedTime !== this.sourceFileModifiedTimeForCache) {
            this.metadata = undefined;
            this.sourceFileModifiedTimeForCache = sourceFileModifiedTime;
        }
    }

    private getFileModifiedTime(): number {
        return pathModifiedTime(this.getContentPath());
    }

    private getContentPath(): string {
        return path.join(this.config.contentDir, `${this.apiPath}.yaml`);
    }

    public getMetadata(): ComponentMetadata {
        this.refreshMetadata();
        if (!this.metadata) throw new Error('unable to retrieve metadata');
        return this.metadata;
    }

    private refreshMetadata(): void {
        this.clearCacheIfOutdated();
        if (this.metadata) return;
        const fullPath = this.getContentPath();

        if (!pathIsFile(fullPath)) {
            this.metadata = undefined;
        }

        const yaml = fs.readFileSync(fullPath, 'utf-8');
        const parsedYaml = YAML.parse(yaml);
        if (!['gallery', 'markdown', 'markdownPage'].includes(parsedYaml?.type)) {
            throw new Error('Valid component type not found');
        }
        parsedYaml.apiPath = this.apiPath;
        parsedYaml.uiPath ??= this.apiPath;
        parsedYaml.title ??= this.apiPath;
        this.metadata = parsedYaml;
    }

    public getGallery(): IGallery {
        if (!this.gallery) throw new Error('No gallery component at this path');
        return this.gallery;
    }

    public getMarkdown(): IMarkdownRecurse {
        if (!this.markdown) throw new Error('No markdown component at this path');
        return this.markdown;
    }
}
