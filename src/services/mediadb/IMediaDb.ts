export interface IMediaDb {
    shutdown(): Promise<void>;
    initialise(): Promise<void>;
    getVersion(): Promise<number>;
}
