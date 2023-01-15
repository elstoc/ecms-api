export type MdFileMeta = {
    [key: string]: string | undefined;
};

export type MdNavContents = {
    meta?: MdFileMeta;
    children?: MdNavContents[];
}

export interface IMarkdown {
    getSourcePath(uiPath: string): string,
    getNavData(uiPath: string): Promise<MdNavContents | undefined>,
}
