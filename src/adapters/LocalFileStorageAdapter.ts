import path from 'path';
import fs from 'fs';

import { IStorageAdapter } from './IStorageAdapter';

export class LocalFileStorageAdapter implements IStorageAdapter {
    public constructor(
        private dataDir: string
    ) {
        if (!this.isExtantDirectory(dataDir)) {
            throw new Error(`${dataDir} is not an extant directory`);
        }

        ['content', 'admin', 'cache'].forEach((subDir) => {
            this.createDirectoryIfNotExists(path.join(dataDir, subDir));
        });
    }

    private isExtantDirectory(fullPath: string) {
        return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    }

    private isExtantFile(fullPath: string) {
        return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
    }

    private createDirectoryIfNotExists(fullPath: string) {
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
    }

    public async listContentChildren(contentDirPath: string, fileMatcher: (fileName: string) => boolean): Promise<string[]> {
        const fullPath = path.join(this.dataDir, 'content', contentDirPath);
        if (!this.isExtantDirectory(fullPath)) {
            return [];
        }
        const dir = await fs.promises.readdir(fullPath);
        return dir.filter(fileMatcher);
    }

    public async getContentFile(contentPath: string): Promise<Buffer> {
        return this.getFile(this.getContentFullPath(contentPath));
    }

    public async getGeneratedFile(contentPath: string, tag: string): Promise<Buffer> {
        return this.getFile(this.getGeneratedFileFullPath(contentPath, tag));
    }

    private async getFile(fullPath: string): Promise<Buffer> {
        if (!this.isExtantFile(fullPath)) {
            throw new Error(`${fullPath} is not an extant file`);
        }
        return fs.promises.readFile(fullPath);
    }

    public async storeGeneratedFile(contentPath: string, tag: string, fileBuffer: Buffer): Promise<void> {
        const targetFilePath = this.getGeneratedFileFullPath(contentPath, tag);
        this.createDirectoryIfNotExists(path.dirname(targetFilePath));
        await fs.promises.writeFile(targetFilePath, fileBuffer);
    }

    public generatedFileIsOlder(contentPath: string, tag: string): boolean {
        return this.pathModifiedTime(this.getGeneratedFileFullPath(contentPath, tag))
            < this.pathModifiedTime(this.getContentFullPath(contentPath));
    }

    public contentFileExists(contentPath: string): boolean {
        return this.isExtantFile(this.getContentFullPath(contentPath));
    }

    public contentDirectoryExists(contentPath: string): boolean {
        return this.isExtantDirectory(this.getContentFullPath(contentPath));
    }

    public getContentFileModifiedTime(contentPath: string): number {
        return this.pathModifiedTime(this.getContentFullPath(contentPath));
    }

    private pathModifiedTime(fullPath: string): number {
        return fs.existsSync(fullPath)
            ? fs.statSync(fullPath).mtimeMs
            : 0;
    }

    private getContentFullPath(contentPath: string): string {
        return path.join(this.dataDir, 'content', contentPath);
    }

    private getGeneratedFileFullPath(contentPath: string, tag: string): string {
        const baseName = path.basename(contentPath);
        const dirName = path.dirname(contentPath);
        return path.join(this.dataDir, 'cache', dirName, tag, baseName);
    }
    
    public splitPath(pathToSplit: string): string[] {
        return pathToSplit
            .replace(/^\//, '')
            .replace(/\/$/, '')
            .split('/');
    }
}
