import path from 'path';
import fs from './fs';

import { IStorageAdapter } from './IStorageAdapter';
import { IDatabaseAdapter } from './IDatabaseAdapter';
import { SQLiteDatabaseAdapter } from './SQLiteDatabaseAdapter';

export class LocalFileStorageAdapter implements IStorageAdapter {
    public constructor(
        private dataDir: string,
        private storageWriteUid?: number,
        private storageWriteGid?: number,
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
            this.createDirectoryIfNotExists(path.dirname(fullPath));
            fs.mkdirSync(fullPath);
            this.setOwnership(fullPath);
        }
    }

    private setOwnership(fullPath: string) {
        if (this.storageWriteUid && this.storageWriteGid) {
            try {
                fs.chownSync(fullPath, this.storageWriteUid, this.storageWriteGid);
            } catch {
                // ignore error
            }
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

    public async getContentDb(contentPath: string): Promise<IDatabaseAdapter> {
        if (!this.contentFileExists(contentPath)) {
            await this.storeContentFile(contentPath, Buffer.from(''));
        }
        const db = new SQLiteDatabaseAdapter(this.getContentFullPath(contentPath));
        await db.initialise();
        await db.exec('PRAGMA foreign_keys = ON');
        return db;
    }

    public async getContentFile(contentPath: string): Promise<Buffer> {
        return this.getFile(this.getContentFullPath(contentPath));
    }

    public async getAdminFile(adminPath: string): Promise<Buffer> {
        return this.getFile(this.getAdminFullPath(adminPath));
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

    public async storeContentFile(apiPath: string, fileBuffer: Buffer): Promise<void> {
        await this.storeFile(this.getContentFullPath(apiPath), fileBuffer);
    }

    public async storeGeneratedFile(contentPath: string, tag: string, fileBuffer: Buffer): Promise<void> {
        await this.storeFile(this.getGeneratedFileFullPath(contentPath, tag), fileBuffer);
    }

    public async storeAdminFile(adminPath: string, fileBuffer: Buffer): Promise<void> {
        await this.storeFile(this.getAdminFullPath(adminPath), fileBuffer);
    }

    private async storeFile(fullPath: string, fileBuffer: Buffer): Promise<void> {
        this.createDirectoryIfNotExists(path.dirname(fullPath));
        await fs.promises.writeFile(fullPath, fileBuffer);
        this.setOwnership(fullPath);
    }

    public async deleteContentFile(contentPath: string): Promise<void> {
        await this.deleteFile(this.getContentFullPath(contentPath));
    }

    private async deleteFile(fullPath: string): Promise<void> {
        if (!this.isExtantFile(fullPath)) {
            throw new Error(`${fullPath} is not an extant file`);
        }
        await fs.promises.rm(fullPath);
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

    public getAdminFileModifiedTime(adminPath: string): number {
        return this.pathModifiedTime(this.getAdminFullPath(adminPath));
    }

    private pathModifiedTime(fullPath: string): number {
        return fs.existsSync(fullPath)
            ? fs.statSync(fullPath).mtimeMs
            : 0;
    }

    public getContentFullPath(contentPath: string): string {
        return path.join(this.dataDir, 'content', contentPath);
    }

    private getAdminFullPath(adminPath: string): string {
        return path.join(this.dataDir, 'admin', adminPath);
    }

    private getGeneratedFileFullPath(contentPath: string, tag: string): string {
        return path.join(this.dataDir, 'cache', path.dirname(contentPath), tag, path.basename(contentPath));
    }
}
