import fs from 'fs';
import YAML from 'yaml';

import { SitePaths } from '../site';
import { ISiteComponent, ComponentMetadata } from './ISiteComponent';

export class SiteComponent implements ISiteComponent {
    private paths: SitePaths;
    private apiPath: string;
    private sourceFileModifiedTimeForCache = 0;
    private metadata?: ComponentMetadata;

    public constructor(paths: SitePaths, apiPath: string) {
        this.paths = paths;
        this.apiPath = apiPath;
        if (!fs.existsSync(this.paths.getContentPath(apiPath))) {
            throw new Error(`A content directory does not exist for the path ${this.apiPath}`);
        }
        this.clearCacheIfOutdated();
    }

    private clearCacheIfOutdated(): void {
        const sourceFileModifiedTime = this.getFileModifiedTime();
        if (sourceFileModifiedTime !== this.sourceFileModifiedTimeForCache) {
            this.metadata = undefined;
            this.sourceFileModifiedTimeForCache = sourceFileModifiedTime;
        }
    }

    private getFileModifiedTime(): number {
        return fs.statSync(this.getContentPath()).mtimeMs;
    }

    private getContentPath(): string {
        return this.paths.getContentPathIfExists(`${this.apiPath}.yaml`);
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

        if (!fs.existsSync(fullPath)) {
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
}
