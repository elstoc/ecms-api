export type Video = {
    name: string;
    category: string;
    director: string;
    length_mins: number;
    to_watch_priority: number;
    progress: string;
}

type videoIdOnly = {
    id: number;
}

export type VideoWithId = Video & videoIdOnly;

export enum LookupTables {
    video_category = 'l_categories',
    video_media_type = 'l_media_types',
    video_media_location = 'l_media_locations'
}

export type LookupRow = {
    code: string;
    description: string;
}

export type LookupValues = {
    [key: string]: string;
}

export type VideoQueryParams = {
   maxLength?: number;
}

export interface IVideoDb {
    shutdown(): Promise<void>;
    initialise(): Promise<void>;
    getVersion(): Promise<number>;
    getLookupValues(tableName: string): Promise<LookupValues>;
    addVideo(video: Video): Promise<void>;
    updateVideo(video: VideoWithId): Promise<void>;
    getVideo(id: number): Promise<VideoWithId>;
    queryVideos(queryParams?: VideoQueryParams): Promise<VideoWithId[]>;
}
