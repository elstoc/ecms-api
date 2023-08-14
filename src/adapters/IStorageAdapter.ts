export interface IStorageAdapter {
    listContentChildren(contentDirPath: string, fileMatcher: (fileName: string) => boolean): Promise<string[]>;
    contentFileExists(contentPath: string): boolean;
    contentDirectoryExists(contentPath: string): boolean;
    getContentFile(apiPath: string): Promise<Buffer>;
    getAdminFile(adminPath: string): Promise<Buffer>;
    getGeneratedFile(apiPath: string, tag: string): Promise<Buffer>;
    storeGeneratedFile(apiPath: string, tag: string, fileBuffer: Buffer): Promise<void>;
    storeAdminFile(adminPath: string, fileBuffer: Buffer): Promise<void>;
    generatedFileIsOlder(apiPath: string, tag: string): boolean;
    getContentFileModifiedTime(apiPath: string): number;
    getAdminFileModifiedTime(adminPath: string): number;
}
