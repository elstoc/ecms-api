export type MdFileMeta = {
    [key: string]: string | undefined;
};

export type MdNavContents = {
    meta?: MdFileMeta;
    children?: MdNavContents[];
}

export interface IMarkdown {
    getSourcePath(relPath: string): string,
    getNavData(relPath: string): Promise<MdNavContents | undefined>,
}
