import path from 'path';
import YAML from 'yaml';
import _ from 'lodash';

import { IMarkdownRecurse, MarkdownStructure } from './IMarkdownRecurse';
import { Config, sortByWeightAndTitle, splitFrontMatter, splitPath, userHasReadAccess, userHasWriteAccess } from '../../utils';
import { IStorageAdapter } from '../../adapters/IStorageAdapter';
import { NotFoundError, NotPermittedError } from '../../errors';
import { User } from '../auth';

export class MarkdownRecurse implements IMarkdownRecurse {
    private apiPath: string;
    private contentPath: string;
    private childrenContentDir: string;
    private metadata?: MarkdownStructure;
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

    public async getFile(targetApiPath: string, user?: User): Promise<Buffer> {
        this.throwIfNoContentFile();
        await this.getMetadata();
        if (!userHasReadAccess(user, this.metadata?.restrict)) {
            throw new NotPermittedError();
        }
        if (targetApiPath === this.apiPath) {
            return this.storage.getContentFile(this.contentPath);
        } else {
            const nextChild = this.getNextChildInTargetPath(targetApiPath);
            return nextChild.getFile(targetApiPath, user);
        }
    }

    public async writeFile(targetApiPath: string, fileContent: string, user?: User): Promise<void> {
        this.throwIfNoContentFile();
        await this.getMetadata();
        if (!userHasWriteAccess(user, this.metadata?.allowWrite)) {
            throw new NotPermittedError();
        }
        if (targetApiPath === this.apiPath) {
            return this.storage.storeContentFile(this.contentPath, Buffer.from(fileContent));
        } else {
            const nextChild = this.getNextChildInTargetPath(targetApiPath);
            return nextChild.writeFile(targetApiPath, fileContent, user);
        }
    }

    private throwIfNoContentFile(): void {
        if (!this.contentPath.endsWith('.md') || !this.storage.contentFileExists(this.contentPath)) {
            throw new NotFoundError(`No markdown file found matching path ${this.apiPath}`);
        }
    }

    private getNextChildInTargetPath(targetApiPath: string): IMarkdownRecurse {
        /* split the "target path" and "directory containing this instance's children"
           into path segment arrays */
        const targetApiPathSplit = splitPath(targetApiPath);
        const thisChildrenContentDirSplit = splitPath(this.childrenContentDir);

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

    private async getMetadata(): Promise<MarkdownStructure> {
        const contentModifiedTime = this.storage.getContentFileModifiedTime(this.contentPath);

        if (this.metadata && contentModifiedTime === this.metadataFromSourceFileTime) {
            return this.metadata;
        }

        const frontMatter = await this.parseFrontMatter();

        const fieldList = ['apiPath', 'title', 'uiPath', 'weight', 'restrict', 'allowWrite'];
        const pickedFields = _.pick(frontMatter, fieldList);
        const additionalData = _.omit(frontMatter, fieldList);

        this.metadata = {
            apiPath: this.apiPath,
            title: path.basename(this.apiPath, '.md'),
            ...pickedFields,
            additionalData
        };

        this.metadataFromSourceFileTime = contentModifiedTime;
        return this.metadata;
    }

    private async parseFrontMatter(): Promise<{ [key: string]: string }> {
        const file = await this.storage.getContentFile(this.contentPath);
        const [yaml] = splitFrontMatter(file.toString('utf-8'));
        return YAML.parse(yaml);
    }
    
    public async getMdStructure(user?: User): Promise<MarkdownStructure | undefined> {
        this.throwIfNoContentFile();
        const metadata = await this.getMetadata();
        if (!userHasReadAccess(user, this.metadata?.restrict)) {
            return undefined;
        }
        const childObjects = await this.getChildren();
        const childStructPromises = childObjects.map((child) => child.getMdStructure(user));
        const children = await Promise.all(childStructPromises);
        const sortedChildren = sortByWeightAndTitle<MarkdownStructure>(children);

        if (this.isRoot) {
            // metadata for the root instance is added to the top of the list
            sortedChildren.unshift({ ...metadata });
            return { children: sortedChildren };
        } else if (children.length === 0) {
            return { ...metadata };
        }

        return { ...metadata, children: sortedChildren };
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
}
