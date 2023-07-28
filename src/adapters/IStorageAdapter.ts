export type Category = 'content' | 'cache' | 'admin';

export interface IStorageAdapter {
    listChildren(category: Category, dirPath: string, fileMatcher: (fileName: string) => boolean): Promise<string[]>;
    /*get(apiPath: string, tags?: string[]): Promise<Buffer>;
    send(response: Response, apiPath: string, tags?: string[]): void;
    getModifiedTime(apiPath: string, tags?: string[]): Promise<number>;
    generateTaggedFile(apiPath: string, tags: string[], generator: (inFile: Buffer) => Buffer): Promise<void>;
    taggedFileIsNewer(apiPath: string, tags?: string[]): Promise<boolean>;*/
}
