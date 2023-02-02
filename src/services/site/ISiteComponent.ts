export type ComponentMetadata = {
    apiPath: string;
    uiPath: string;
    title: string;
    type: string;
    weight?: number;
    restrict?: string;
    [key: string]: number | string | undefined;
}

export interface ISiteComponent {
    getMetadata(): ComponentMetadata
}
