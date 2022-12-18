import path from 'path';
import { Config } from '../utils';

export class SitePaths {
    private contentDir: string;
    private cacheDir: string;

    public constructor(config: Config) {
        this.contentDir = config.contentDir;
        this.cacheDir = config.cacheDir;
    }

    public getCachePath(...sitePaths: string[]): string {
        return path.resolve(this.cacheDir, ...sitePaths);
    }

    public getContentPath(...sitePaths: string[]): string {
        return path.resolve(this.contentDir, ...sitePaths);
    }
}
