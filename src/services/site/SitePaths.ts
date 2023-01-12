import fs from 'fs';
import path from 'path';
import { Config } from '../../utils';

export class SitePaths {
    private contentDir: string;
    private cacheDir: string;
    private adminDir: string;

    public constructor(config: Config) {
        this.contentDir = config.contentDir;
        this.cacheDir = config.cacheDir;
        this.adminDir = config.adminDir;
    }

    public getContentPath(...paths: string[]): string {
        return path.resolve(this.contentDir, ...paths);
    }

    public getContentPathIfExists(...paths: string[]): string {
        const fullPath = this.getContentPath(...paths);
        return this.getPathIfExists(fullPath);
    }

    public getCachePath(...paths: string[]): string {
        return path.resolve(this.cacheDir, ...paths);
    }

    public getCachePathIfExists(...paths: string[]): string {
        const fullPath = this.getCachePath(...paths);
        return this.getPathIfExists(fullPath);
    }
    
    public getAdminPath(...paths: string[]): string {
        return path.resolve(this.adminDir, ...paths);
    }

    public getAdminPathIfExists(...paths: string[]): string {
        const fullPath = this.getAdminPath(...paths);
        return this.getPathIfExists(fullPath);
    }
    
    private getPathIfExists(fullPath: string): string {
        if (!fs.existsSync(fullPath)) {
            throw new Error(`File "${fullPath}" does not exist`);
        }
        return fullPath;
    }
}
