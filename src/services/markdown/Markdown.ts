import path from 'path';
import YAML from 'yaml';
import _ from 'lodash';

import { IMarkdown, MarkdownPage, MarkdownTree } from './IMarkdown';
import { Config, sortByWeightAndTitle, splitFrontMatter, splitPath, userHasReadAccess, userHasWriteAccess, userIsAdmin } from '../../utils';
import { IStorageAdapter } from '../../adapters/IStorageAdapter';
import { NotFoundError, NotPermittedError } from '../../errors';
import { User } from '../auth';

export class Markdown implements IMarkdown {
    private apiPath: string;
    private contentPath: string;
    private childrenContentDir: string;
    private metadata?: MarkdownTree;
    private children: { [key: string]: IMarkdown } = {};
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

    public async getPage(targetApiPath: string, user?: User): Promise<MarkdownPage> {
        this.throwIfNoContentFile();
        await this.getMetadata();
        this.throwIfNoReadAccess(user);

        if (targetApiPath === this.apiPath) {
            const content = await this.getContentFile();
            return {
                content,
                pageExists: true,
                pathValid: true,
                canWrite: this.userHasWriteAccess(user)
            };
        }

        try {
            const nextChild = this.getNextChildInTargetPath(targetApiPath);
            return await nextChild.getPage(targetApiPath, user);
        } catch (e: unknown) {
            if (e instanceof NotFoundError && userIsAdmin(user)) {
                const mdTemplate = '---\ntitle: xxx\n---\n\n';
                const pathValid = this.apiPathIsValid(targetApiPath);
                return {
                    content: pathValid ? mdTemplate : '',
                    pageExists: false,
                    pathValid,
                    canWrite: pathValid
                };
            } else {
                throw e;
            }
        }
    }

    private async getContentFile(): Promise<string> {
        return (await this.storage.getContentFile(this.contentPath)).toString('utf-8');
    }

    private apiPathIsValid(apiPath: string): boolean {
        if (apiPath === this.apiPath) {
            return true;
        } else if (!apiPath.endsWith('.md')) {
            return false;
        }

        const apiPathWithoutMd = apiPath.substring(0, apiPath.lastIndexOf('.'));
        const pathSegments = splitPath(apiPathWithoutMd);
        const onlyHasValidCharacters = /^[A-Za-z0-9_-]+$/;

        let pathValid = true;
        pathSegments.forEach((segment) => {
            if (!onlyHasValidCharacters.test(segment)) {
                pathValid = false;
            }
        });
        return pathValid;
    }

    public async writePage(targetApiPath: string, fileContent: string, user?: User): Promise<void> {
        this.throwIfNoContentFile();
        await this.getMetadata();
        this.throwIfNoReadAccess(user);

        if (targetApiPath === this.apiPath) {
            this.throwIfNoWriteAccess(user);
            await this.storage.storeContentFile(this.contentPath, Buffer.from(fileContent));
        } else {
            const nextChild = this.getNextChildInTargetPath(targetApiPath);
            try {
                await nextChild.writePage(targetApiPath, fileContent, user);
            } catch (e: unknown) {
                if (e instanceof NotFoundError && userIsAdmin(user) && this.apiPathIsValid(targetApiPath)) {
                    await nextChild.createContentFile();
                    await nextChild.writePage(targetApiPath, fileContent, user);
                } else {
                    throw e;
                }
            }
        }
    }

    public async createContentFile(): Promise<void> {
        return this.storage.storeContentFile(this.apiPath, Buffer.from(''));
    }

    private throwIfNoContentFile(): void {
        if (!this.contentPath.endsWith('.md') || !this.storage.contentFileExists(this.contentPath)) {
            throw new NotFoundError(`No markdown file found matching path ${this.apiPath}`);
        }
    }

    private throwIfNoReadAccess(user?: User): void {
        if (!this.userHasReadAccess(user)) throw new NotPermittedError();
    }

    private throwIfNoWriteAccess(user?: User): void {
        if (!this.userHasWriteAccess(user)) throw new NotPermittedError();
    }

    private userHasReadAccess(user?: User): boolean {
        return !this.config.enableAuthentication || userHasReadAccess(user, this.metadata?.restrict);
    }

    private userHasWriteAccess(user?: User): boolean {
        return !this.config.enableAuthentication || userHasWriteAccess(user, this.metadata?.allowWrite);
    }

    private getNextChildInTargetPath(targetApiPath: string): IMarkdown {
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

    private getChild(childApiPath: string): IMarkdown {
        this.children[childApiPath] ??= new Markdown(childApiPath, this.config, this.storage);
        return this.children[childApiPath];
    }

    private async getMetadata(): Promise<MarkdownTree> {
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
        const file = await this.getContentFile();
        const [yaml] = splitFrontMatter(file);
        return YAML.parse(yaml);
    }
    
    public async getTree(user?: User): Promise<MarkdownTree | undefined> {
        this.throwIfNoContentFile();
        const metadata = await this.getMetadata();
        if (this.config.enableAuthentication && !userHasReadAccess(user, this.metadata?.restrict)) {
            return undefined;
        }
        const childObjects = await this.getChildren();
        const childStructPromises = childObjects.map((child) => child.getTree(user));
        const children = await Promise.all(childStructPromises);
        const sortedChildren = sortByWeightAndTitle<MarkdownTree>(children);

        if (this.isRoot) {
            // metadata for the root instance is added to the top of the list
            sortedChildren.unshift({ ...metadata });
            return { children: sortedChildren };
        } else if (children.length === 0) {
            return { ...metadata };
        }

        return { ...metadata, children: sortedChildren };
    }

    private async getChildren(): Promise<IMarkdown[]> {
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
