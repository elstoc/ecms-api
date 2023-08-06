import path from 'path';
import YAML from 'yaml';
import { IMarkdownRecurse, MarkdownMetadata, MarkdownStructure } from './IMarkdownRecurse';
import { Config, splitFrontMatter } from '../../utils';
import { Response } from 'express';
import { IStorageAdapter } from '../../adapters/IStorageAdapter';

export class MarkdownRecurse implements IMarkdownRecurse {
    private apiPath: string;
    private contentPath: string;
    private childrenContentDir: string;
    private metadata?: MarkdownMetadata;
    private children: { [key: string]: IMarkdownRecurse } = {};
    private metadataFromSourceFileTime = 0;

    constructor(
        apiPath: string,
        private config: Config,
        private storage: IStorageAdapter,
        private isRoot = false
    ) {
        this.apiPath = apiPath.replace(/^\//, '');
        this.childrenContentDir = this.apiPath.replace(/\.md$/, '');
        this.contentPath = this.isRoot
            ? `${this.apiPath}/index.md`
            : this.apiPath;
    }

    public async sendFile(targetApiPath: string, response: Response): Promise<void> {
        try {
            this.throwIfNoContentFile();
            if (targetApiPath === this.apiPath) {
                const fileBuf = await this.storage.getContentFile(this.contentPath);
                response.send(fileBuf);
            } else {
                const nextChild = this.getNextChildInTargetPath(targetApiPath);
                await nextChild.sendFile(targetApiPath, response);
            }
        } catch (e: unknown) {
            response.sendStatus(404);
        }
    }

    private throwIfNoContentFile(): void {
        if (!this.contentPath.endsWith('.md') || !this.storage.contentFileExists(this.contentPath)) {
            throw new Error(`No markdown file found matching path ${this.apiPath}`);
        }
    }

    private getNextChildInTargetPath(targetApiPath: string): IMarkdownRecurse {
        /* split the "target path" and "directory containing this instance's children"
           into path segment arrays */
        const targetApiPathSplit = this.storage.splitPath(targetApiPath);
        const thisChildrenContentDirSplit = this.storage.splitPath(this.childrenContentDir);

        /* if the target path has one more path segment than the children directory,
           it must be a direct child of this instance */
        if (targetApiPathSplit.length === thisChildrenContentDirSplit.length + 1) {
            return this.getChild(targetApiPath);
        }

        /* target is a deeper child
           get the api path to the next file in the chain */
        const nextChildApiDirSplit = targetApiPathSplit.slice(0, thisChildrenContentDirSplit.length + 1);
        const nextChildApiPath = path.join(...nextChildApiDirSplit) + '.md';
        return this.getChild(nextChildApiPath);
    }

    private getChild(childApiPath: string): IMarkdownRecurse {
        this.children[childApiPath] ??= new MarkdownRecurse(childApiPath, this.config, this.storage);
        return this.children[childApiPath];
    }

    public async getMetadata(): Promise<MarkdownMetadata> {
        this.throwIfNoContentFile();

        const contentModifiedTime = this.storage.getContentFileModifiedTime(this.contentPath);

        if (this.metadata && contentModifiedTime === this.metadataFromSourceFileTime) {
            return this.metadata;
        }

        const frontMatter = await this.parseFrontMatter();

        this.metadataFromSourceFileTime = contentModifiedTime;

        this.metadata = {
            apiPath: this.apiPath,
            ...frontMatter,
            title: frontMatter?.title ?? path.basename(this.apiPath, '.md')
        };

        return this.metadata ?? {};
    }

    private async parseFrontMatter(): Promise<{ [key: string]: string }> {
        const file = await this.storage.getContentFile(this.contentPath);
        const [yaml] = splitFrontMatter(file.toString('utf-8'));
        return YAML.parse(yaml);
    }
    
    public async getMdStructure(): Promise<MarkdownStructure> {
        this.throwIfNoContentFile();
        const metadata = await this.getMetadata();
        const childObjects = await this.getChildren();
        const childStructPromises = childObjects.map((child) => child.getMdStructure());
        const children = await Promise.all(childStructPromises);
        children.sort(this.sortByWeightAndTitle);

        if (this.isRoot) {
            // metadata for the root instance is added to the top of the list
            children.unshift({ metadata });
            return { children };
        } else if (children.length === 0) {
            return { metadata };
        }

        return {metadata, children};
    }

    private async getChildren(): Promise<IMarkdownRecurse[]> {
        const childMdFiles = await this.storage.listContentChildren(
            this.childrenContentDir,
            (childFile) => (
                childFile.endsWith('.md') && !(childFile.endsWith('index.md'))
            )
        );

        return childMdFiles
            .map((childFileName) => {
                const childApiPath = path.join(this.childrenContentDir, childFileName);
                return this.getChild(childApiPath);
            });
    }

    private sortByWeightAndTitle(a: MarkdownStructure, b: MarkdownStructure): number {
            const aWeight = a.metadata?.weight ?? 0;
            const bWeight = b.metadata?.weight ?? 0;
            const aTitle = a.metadata?.title ?? '';
            const bTitle = b.metadata?.title ?? '';

            if (aWeight && !bWeight) return -1;
            if (bWeight && !aWeight) return 1;
            if (aWeight && bWeight) return aWeight - bWeight;
            if (aTitle > bTitle) return 1;
            if (aTitle === bTitle) return 0;
            return -1;
    }
}
