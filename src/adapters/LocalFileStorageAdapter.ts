import path from 'path';
import fs from 'fs';

import { IStorageAdapter } from './IStorageAdapter';

export class LocalFileStorageAdapter implements IStorageAdapter {
    public constructor(
        private dataDir: string
    ) { }

    public async listChildren(apiDir: string, fileMatcher: (fileName: string) => boolean): Promise<string[]> {
        const fullPath = path.join(this.dataDir, 'content', apiDir);
        const dir = await fs.promises.readdir(fullPath);
        return dir.filter(fileMatcher);
    }

    /*public async get(apiPath: string, tags?: string[]): Promise<Buffer> {
        return Buffer.from(`${apiPath}/${tags?.join('_')}`);
    }

    public send(response: Response, apiPath: string, tags?: string[]): void {
        return;
    }

    public async getModifiedTime(apiPath: string, tags?: string[] | undefined): Promise<number> {
        return 1234;
    }

    public async generateTaggedFile(apiPath: string, tags: string[], generator: (inFile: Buffer) => Buffer): Promise<void> {
        return;
    }

    public async taggedFileIsNewer(apiPath: string, tags?: string[] | undefined): Promise<boolean> {
        return false;
    }*/
}
