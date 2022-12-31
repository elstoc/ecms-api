export type MdFileMeta = {
    [key: string]: string | undefined;
};

export type MdNavContents = {
    meta?: MdFileMeta;
    children?: MdNavContents[];
}

export interface IMarkdown {
    getMdFilePath(uiPath: string): string;
    getMdFileMeta(uiPath: string): Promise<MdFileMeta>;
    getMdNavContents(uiPath: string): Promise<MdNavContents>;
}
