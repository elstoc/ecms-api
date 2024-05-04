export type VideoMedia = {
    media_type: string;
    media_location?: string;
    watched?: string;
    notes?: string;
}

export type Video = {
    title: string;
    category: string;
    director: string;
    length_mins: number;
    watched: string;
    to_watch_priority: number;
    progress: string;
    media?: VideoMedia[];
}

export const videoFields = ['title', 'category', 'director', 'length_mins', 'watched', 'to_watch_priority', 'progress'];

export type PrimaryMedium = {
    pm_media_type: string;
    pm_watched: string;
}

type videoIdOnly = {
    id: number;
}

export type VideoWithId = Video & videoIdOnly;

export type VideoWithIdAndPrimaryMedium = VideoWithId & PrimaryMedium;

export enum LookupTables {
    video_category = 'l_categories',
    video_media_type = 'l_media_types',
    video_media_location = 'l_media_locations',
    video_watched_status = 'l_watched_status',
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
    categories?: string[];
    titleLike?: string;
}

export interface IVideoDb {
    shutdown(): Promise<void>;
    initialise(): Promise<void>;
    getVersion(): Promise<number>;
    getLookupValues(tableName: string): Promise<LookupValues>;
    addVideo(video: Video): Promise<number>;
    updateVideo(video: VideoWithId): Promise<void>;
    getVideo(id: number): Promise<VideoWithId>;
    queryVideos(queryParams?: VideoQueryParams): Promise<VideoWithId[]>;
}
