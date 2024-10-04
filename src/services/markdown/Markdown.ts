import path from 'path';
import YAML from 'yaml';

import { IMarkdown, MarkdownPage, MarkdownTree } from './IMarkdown';
import { Config, sortByWeightAndTitle, splitPath } from '../../utils';
import { splitFrontMatter } from './splitFrontMatter';
import { userHasReadAccess, userHasWriteAccess, userIsAdmin } from '../auth/accessUtils';
import { IStorageAdapter } from '../../adapters/IStorageAdapter';
import { NotFoundError, NotPermittedError } from '../../errors';
import { User } from '../auth';
import { Logger } from 'winston';

export class Markdown implements IMarkdown {
    private contentPath: string;
    private metadata?: MarkdownTree;
    private hasFrontMatter = false;
    private children: { [key: string]: IMarkdown } = {};
    private metadataFromSourceFileTime = 0;

    constructor(
        private apiPath: string,
        private uiPath: string,
        private config: Config,
        private storage: IStorageAdapter,
        private logger: Logger,
        private isRoot = false,
        private singlePage = false
    ) {
        this.contentPath = this.isRoot
            ? `${this.apiPath}/index.md`
            : `${this.apiPath}.md`;
    }

    public async getPage(targetApiPath: string, user?: User): Promise<MarkdownPage> {
        this.throwIfNoContentFile();
        await this.getMetadata();
        this.throwIfNoReadAccess(user);

        if (targetApiPath === this.apiPath) {
            this.logger.debug(`getting markdown page ${targetApiPath}`);
            let content = await this.getContentFile();
            if (!this.hasFrontMatter) {
                const [, markdown] = splitFrontMatter(content);
                content = this.getFrontMatterTemplate(this.apiPath) + (markdown || '');
            }
            const canDelete = !this.isRoot && this.userIsAdmin(user) && (await this.getChildFiles()).length === 0;
            return {
                content,
                pageExists: true,
                canDelete,
                pathValid: true,
                canWrite: this.userHasWriteAccess(user)
            };
        }

        try {
            const nextChild = this.getNextChildInTargetPath(targetApiPath);
            return await nextChild.getPage(targetApiPath, user);
        } catch (e: unknown) {
            if (e instanceof NotFoundError && this.userIsAdmin(user)) {
                const pathValid = this.apiPathIsValid(targetApiPath);
                return {
                    content: pathValid ? this.getFrontMatterTemplate(targetApiPath) : '',
                    pageExists: false,
                    canDelete: false,
                    pathValid,
                    canWrite: pathValid
                };
            } else {
                throw e;
            }
        }
    }

    private getFrontMatterTemplate(filePath: string): string {
        return `---\ntitle: ${path.basename(filePath)}\n---\n\n`;
    }

    private async getContentFile(): Promise<string> {
        return (await this.storage.getContentFile(this.contentPath)).toString('utf-8');
    }

    private apiPathIsValid(targetApiPath: string): boolean {
        if (targetApiPath === this.apiPath) return true;
        if (this.singlePage) return false;

        const onlyHasValidCharacters = /^[A-Za-z0-9_-]+$/;

        let pathValid = true;
        splitPath(targetApiPath).forEach((segment) => {
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
            this.logger.info(`writing markdown page ${targetApiPath}`);
            this.throwIfNoWriteAccess(user);
            await this.storage.storeContentFile(this.contentPath, Buffer.from(fileContent));
            this.metadataFromSourceFileTime = -1;
        } else {
            const nextChild = this.getNextChildInTargetPath(targetApiPath);
            try {
                await nextChild.writePage(targetApiPath, fileContent, user);
            } catch (e: unknown) {
                if (e instanceof NotFoundError && this.userIsAdmin(user) && this.apiPathIsValid(targetApiPath)) {
                    await nextChild.createContentFile();
                    await nextChild.writePage(targetApiPath, fileContent, user);
                } else {
                    throw e;
                }
            }
        }
    }

    public async createContentFile(): Promise<void> {
        await this.storage.storeContentFile(this.contentPath, Buffer.from(this.getFrontMatterTemplate(this.apiPath)));
    }

    private throwIfNoContentFile(): void {
        if (!this.storage.contentFileExists(this.contentPath)) {
            throw new NotFoundError(`No markdown file found matching path ${this.apiPath}`);
        }
    }

    private throwIfNoReadAccess(user?: User): void {
        if (!this.userHasReadAccess(user)) throw new NotPermittedError();
    }

    private userHasReadAccess(user?: User): boolean {
        return !this.config.enableAuthentication || userHasReadAccess(user, this.metadata?.restrict);
    }

    private throwIfNoWriteAccess(user?: User): void {
        if (!this.userHasWriteAccess(user)) throw new NotPermittedError();
    }

    private userHasWriteAccess(user?: User): boolean {
        return !this.config.enableAuthentication || userHasWriteAccess(user, this.metadata?.allowWrite);
    }

    private userIsAdmin(user?: User): boolean {
        return !this.config.enableAuthentication || userIsAdmin(user);
    }

    private throwIfNotAdmin(user?: User): void {
        if (!userIsAdmin(user)) throw new NotPermittedError();
    }

    public async deletePage(targetApiPath: string, user?: User | undefined): Promise<void> {
        this.throwIfNotAdmin(user);
        this.throwIfNoContentFile();

        if (targetApiPath === this.apiPath) {
            if (this.isRoot) {
                throw new NotPermittedError('cannot delete the root file');
            }
            const children = await this.getChildFiles();
            if (children.length > 0) {
                throw new NotPermittedError('cannot delete markdown files which have children');
            }
            this.logger.info(`deleting markdown page ${targetApiPath}`);
            this.storage.deleteContentFile(this.contentPath);
        } else {
            const nextChild = this.getNextChildInTargetPath(targetApiPath);
            return await nextChild.deletePage(targetApiPath, user);
        }
    }

    private getNextChildInTargetPath(targetApiPath: string): IMarkdown {
        if (this.singlePage) {
            throw new NotFoundError('A Single Page Markdown component cannot have sub-pages');
        }
        /* split the "target path" and "directory containing this instance's children"
           into path segment arrays */
        const targetApiPathSplit = splitPath(targetApiPath);
        const thisApiPathSplit = splitPath(this.apiPath);

        /* if the target path has one more path segment than this instance,
           it must be a direct child of this instance */
        if (targetApiPathSplit.length === thisApiPathSplit.length + 1) {
            return this.getChild(targetApiPath);
        }

        /* target is a deeper child
           get the api path to the next file in the chain */
        const nextChildApiDirSplit = targetApiPathSplit.slice(0, thisApiPathSplit.length + 1);
        const nextChildApiPath = path.join(...nextChildApiDirSplit);
        return this.getChild(nextChildApiPath);
    }

    private getChild(childApiPath: string): IMarkdown {
        const childUiPath = path.join(this.uiPath, childApiPath.split('/').slice(-1)[0] || '');
        this.children[childApiPath] ??= new Markdown(childApiPath, childUiPath, this.config, this.storage, this.logger);
        return this.children[childApiPath];
    }

    private async getMetadata(): Promise<MarkdownTree> {
        const contentModifiedTime = this.storage.getContentFileModifiedTime(this.contentPath);

        if (this.metadata && contentModifiedTime === this.metadataFromSourceFileTime) {
            return this.metadata;
        }

        const frontMatter = await this.parseFrontMatter();
        this.hasFrontMatter = Boolean(frontMatter && Object.keys(frontMatter).length);

        const { apiPath, title, weight, restrict, allowWrite } = frontMatter ?? {};

        this.metadata = {
            apiPath: apiPath ?? this.apiPath,
            uiPath: this.uiPath,
            title: title ?? path.basename(this.apiPath),
            weight: weight ? parseInt(weight) : undefined,
            restrict, allowWrite
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

        if (this.config.enableAuthentication && !this.userHasReadAccess(user)) {
            if (this.isRoot) {
                throw new NotPermittedError();
            }
            return undefined;
        }

        this.isRoot && this.logger.debug(`getting markdown tree at ${this.apiPath}`);

        if (this.singlePage) {
            return {apiPath: this.apiPath, uiPath: this.uiPath, children: [metadata] };
        }

        const childObjects = await this.getChildren();
        const childTreePromises = childObjects.map((child) => child.getTree(user));
        const children = await Promise.all(childTreePromises);
        const sortedChildren = sortByWeightAndTitle<MarkdownTree>(children);

        if (this.isRoot) {
            // metadata for the root instance is added to the top of the list
            sortedChildren.unshift(metadata);
            return { apiPath: this.apiPath, uiPath: this.uiPath, children: sortedChildren };
        } else if (children.length === 0) {
            return { ...metadata };
        }

        return { ...metadata, children: sortedChildren };
    }

    private async getChildren(): Promise<IMarkdown[]> {
        const childMdFiles = await this.getChildFiles();
        return childMdFiles
            .map((childFileName) => {
                const childApiPath = path.join(this.apiPath, path.basename(childFileName, '.md'));
                return this.getChild(childApiPath);
            });
    }

    private async getChildFiles(): Promise<string[]> {
        return this.storage.listContentChildren(
            this.apiPath,
            (childFile) => (
                childFile.endsWith('.md') && !(childFile.endsWith('index.md'))
            )
        );
    }
}
