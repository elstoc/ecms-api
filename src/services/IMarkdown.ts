export type MdFileMeta = {
    uiPath: string;
    filePath?: string;
    title?: string;
    weight?: number;
}

export type MdNavContents = {
    meta: MdFileMeta;
    children?: MdNavContents[];
}

export interface IMarkdown {
    getMdFilePath(uiPath: string): string;
    getMdFileMeta(uiPath: string): Promise<MdFileMeta>;
    getMdNavContents(uiPath: string): Promise<MdNavContents>;
}
