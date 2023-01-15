import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

import { SitePaths } from '../site';
import { splitFrontMatter } from '../../utils';
import { IMarkdownPage } from './IMarkdownPage';

export class MarkdownPage implements IMarkdownPage {
    private paths: SitePaths;
    private uiPath: string;
    private sourceFileModifiedTimeForCache = 0;
    private metadata?: { [key: string]: string };

    public constructor(paths: SitePaths, uiPath: string) {
        this.paths = paths;
        this.uiPath = uiPath;
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
        try {
            return fs.statSync(this.getContentPath()).mtimeMs;
        } catch {
            return 0;
        }
    }

    public getContentPath(): string {
        const fullPath = this.paths.getContentPath(this.uiPath.replace(/^\//,''));
        return this.extantDirectory(fullPath)
            ? path.resolve(fullPath, 'index.md')
            : `${fullPath}.md`;
    }

    private extantDirectory(fullPath: string): boolean {
        return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    }

    public async getMetadata(): Promise<undefined | { [key: string]: string | undefined}> {
        await this.refreshMetadata();
        return this.metadata;
    }

    private async refreshMetadata(): Promise<void> {
        this.clearCacheIfOutdated();
        if (this.metadata) return;

        const yaml = await this.parseFrontMatter();
        this.metadata = {
            uiPath: this.uiPath,
            title: yaml?.title || path.basename(this.uiPath)
        };
    }
    
    private async parseFrontMatter(): Promise<{ [key: string]: string }> {
        const fullPath = this.getContentPath();

        if (!fs.existsSync(fullPath)) {
            return {};
        }

        const file = await fs.promises.readFile(fullPath, 'utf-8');
        const [yaml] = splitFrontMatter(file);
        return YAML.parse(yaml);
    }
}
