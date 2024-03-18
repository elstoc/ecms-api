export enum LookupTables {
    video_category = 'lookup_video_category',
    video_media_type = 'lookup_video_media_type',
    video_media_location = 'lookup_video_media_location'
}

export type LookupRow = {
    code: string;
    description: string;
}

export type LookupValues = {
    [key: string]: string;
}

export interface IMediaDb {
    shutdown(): Promise<void>;
    initialise(): Promise<void>;
    getVersion(): Promise<number>;
    getLookupValues(tableName: string): Promise<LookupValues>;
}
