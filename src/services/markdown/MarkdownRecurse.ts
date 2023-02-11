import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { pathIsDirectory, pathIsFile, pathModifiedTime } from '../../utils/site/fsUtils';
import { IMarkdownRecurse, MarkdownMetadata, MarkdownStructure } from './IMarkdownRecurse';
import { Config, splitFrontMatter } from '../../utils';
import { Response } from 'express';

export class MarkdownRecurse implements IMarkdownRecurse {
    private apiPath: string;
    private isRoot: boolean;
    private config: Config;
    private metadata?: MarkdownMetadata;
    private childCache: { [key: string]: IMarkdownRecurse } = {};
    private metadataBackingFileModifiedTime = 0;

    constructor(apiPath: string, config: Config, root = false) {
        this.apiPath = apiPath.replace(/^\//, '');
        this.config = config;
        this.isRoot = root;
        this.throwIfInvalid();
        this.clearCacheIfOutdated();
    }

    private throwIfInvalid(): void {
        if (this.isRoot && this.apiPath.endsWith('.md')) {
            throw new Error('Root path must not point to a markdown file');
        }
        if (this.isRoot && !pathIsDirectory(this.fullApiPath())) {
            throw new Error('Root path must point to an existing directory');
        }
        if (!this.hasBackingFile()) {
            throw new Error(`The path ${this.apiPath} must be backed by a valid markdown file`);
        }
    }

    private hasBackingFile(): boolean {
        return this.backingFileFullPath().endsWith('.md') && pathIsFile(this.backingFileFullPath());
    }

    private backingFileFullPath(): string {
        return this.isRoot
            ? `${this.fullApiPath()}/index.md`
            : this.fullApiPath();
    }

    private childrenApiDir(): string {
        return this.isRoot
            ? this.apiPath
            : this.apiPath.substring(0, this.apiPath.lastIndexOf('.md'));
    }

    private fullApiPath(): string {
        return path.join(this.config.contentDir, this.apiPath);
    }

    private clearCacheIfOutdated(): void {
        if (this.backingFileModifiedTime() !== this.metadataBackingFileModifiedTime) {
            this.metadata = undefined;
            this.metadataBackingFileModifiedTime = this.backingFileModifiedTime();
        }
    }

    private backingFileModifiedTime(): number {
        return pathModifiedTime(this.backingFileFullPath());
    }

    public sendFile(apiPath: string, response: Response): void {
        this.throwIfInvalid();
        try {
            if (this.apiPath === apiPath) {
                response.sendFile(this.backingFileFullPath());
            } else {
                this.getNextChildInPath(apiPath).sendFile(apiPath, response);
            }
        } catch (e: unknown) {
            response.sendStatus(404);
        }
    }

    private getNextChildInPath(apiPath: string): IMarkdownRecurse {
        const nextChildPathPart = apiPath.replace(`${this.childrenApiDir()}/`, '').split('/')[0];
        let nextChildApiPath = `${path.join(this.childrenApiDir(), nextChildPathPart)}`;
        if (pathIsDirectory(path.join(this.config.contentDir, nextChildApiPath))) {
            nextChildApiPath += '.md';
        }
        if (!pathIsFile(path.join(this.config.contentDir, nextChildApiPath))) {
            throw new Error('No backing file found for some portions of the path');
        }
        return this.getChild(nextChildApiPath);
    }

    private getChild(childApiPath: string): IMarkdownRecurse {
        this.childCache[childApiPath] ??= new MarkdownRecurse(childApiPath, this.config);
        return this.childCache[childApiPath];
    }

    public async getMetadata(): Promise<MarkdownMetadata> {
        this.throwIfInvalid();
        await this.refreshMetadata();
        return this.metadata || {};
    }

    private async refreshMetadata(): Promise<void> {
        this.clearCacheIfOutdated();
        if (this.metadata) return;
        const frontMatter = await this.parseFrontMatter();
        this.metadata = {
            uiPath: this.apiPath,
            title: frontMatter?.title || path.basename(this.apiPath, '.md')
        };
    }
    
    private async parseFrontMatter(): Promise<{ [key: string]: string }> {
        const file = await fs.promises.readFile(this.backingFileFullPath(), 'utf-8');
        const [yaml] = splitFrontMatter(file);
        return YAML.parse(yaml);
    }
    
    public async getStructure(): Promise<MarkdownStructure> {
        const metadata = await this.getMetadata();
        const childObjects = this.getChildren();
        const childStructPromises = childObjects.map((child) => child.getStructure());
        const children = await Promise.all(childStructPromises);

        if (this.isRoot) {
            children.unshift({ metadata });
            return { children };
        }
        if (children.length === 0) return { metadata };
        return {metadata, children};
    }

    private getChildren(): IMarkdownRecurse[] {
        const childrenDirFullPath = path.join(this.config.contentDir, this.childrenApiDir());

        if (!pathIsDirectory(childrenDirFullPath)) return [];

        const childMdFiles = fs.readdirSync(childrenDirFullPath).filter((childFile) => (
            childFile.endsWith('.md') && !(this.isRoot && childFile.endsWith('index.md'))
        ));

        return childMdFiles.map((childFile) => (
            this.getChild(`${this.childrenApiDir()}/${childFile}`)
        ));
    }
}
