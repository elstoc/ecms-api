import { User } from '../auth';

export type Video = {
    title: string;
    category: string;
    director: string | null;
    length_mins: number | null;
    watched: string;
    to_watch_priority: number | null;
    progress: string | null;
    imdb_id: string | null;
    image_url: string | null;
    year: number | null;
    actors: string | null;
    plot: string | null;
    tags: string | null;
    primary_media_type: string | null;
    primary_media_location: string | null;
    primary_media_watched: string | null;
    other_media_type: string | null;
    other_media_location: string | null;
    media_notes: string | null;
}

export const videoFields = [
    'title', 'category', 'director', 'length_mins', 'watched', 'to_watch_priority', 'progress',
    'imdb_id', 'image_url', 'year', 'actors', 'plot', 'primary_media_type', 'primary_media_location',
    'primary_media_watched', 'other_media_type', 'other_media_location', 'media_notes'
];

type VideoIdOnly = {
    id: number;
}

export type VideoWithId = Video & VideoIdOnly;

export type VideoSummary = {
    id: number;
    title: string;
    category: string;
    director: string | null;
    length_mins: number | null;
    watched: string;
    to_watch_priority: number | null;
    progress: string | null;
    year: number | null;
    actors: string | null;
    pm_media_type: string | null;
    pm_watched: string | null;
    tags: string | null;
    primary_media_type: string | null;
    primary_media_location: string | null;
    primary_media_watched: string | null;
    other_media_type: string | null;
    other_media_location: string | null;
    media_notes: string | null;
}

export const videoSummaryFields = [
    'id', 'title', 'category', 'director', 'length_mins', 'watched', 'to_watch_priority', 'progress',
    'year', 'actors', 'primary_media_type', 'primary_media_location',
    'primary_media_watched', 'other_media_type', 'other_media_location', 'media_notes'
];

export type PrimaryMedium = {
    pm_media_type: string | null;
    pm_watched: string | null;
}

export type VideoSummaryAndPrimaryMedium = VideoSummary & PrimaryMedium;

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

export type VideoFilters = {
    maxLength?: number;
    categories?: string[];
    tags?: string[];
    titleContains?: string;
    watched?: string;
    mediaWatched?: string;
    sortPriorityFirst?: boolean;
    minResolution?: string;
}

export type VideoUpdate = {
    id: number;
    to_watch_priority: 0 | 1;
}

export interface IVideoDb {
    shutdown(): Promise<void>;
    initialise(): Promise<void>;
    getVersion(): Promise<number>;
    getLookupValues(tableName: string): Promise<LookupValues>;
    getAllTags(): Promise<string[]>;
    addVideo(video: Video, user?: User): Promise<number>;
    updateVideo(video: VideoWithId, user?: User): Promise<void>;
    updateVideos(videoUpdates: VideoUpdate[], user?: User): Promise<void>;
    getVideo(id: number): Promise<VideoWithId>;
    deleteVideo(id: number, user?: User): Promise<void>;
    queryVideos(filters?: VideoFilters, limit?: number): Promise<VideoSummaryAndPrimaryMedium[]>;
    getOmdbApiKey(user?: User): string;
}
