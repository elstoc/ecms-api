import fs from 'fs';
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

    public getCachePathIfExists(...sitePaths: string[]): string {
        const fullPath = this.getCachePath(...sitePaths);
        return this.getPathIfExists(fullPath);
    }
    
    private getPathIfExists(fullPath: string): string {
        if (!fs.existsSync(fullPath)) {
            throw new Error('File does not exist');
        }
        return fullPath;
    }

    public getContentPath(...sitePaths: string[]): string {
        return path.resolve(this.contentDir, ...sitePaths);
    }

    public getContentPathIfExists(...sitePaths: string[]): string {
        const fullPath = this.getContentPath(...sitePaths);
        return this.getPathIfExists(fullPath);
    }
}
