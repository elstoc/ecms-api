export interface ISitePaths {
    getContentPath(...paths: string[]): string,
    getContentPathIfExists(...paths: string[]): string,
    getCachePath(...paths: string[]): string,
    getCachePathIfExists(...paths: string[]): string,
    getAdminPath(...paths: string[]): string,
    getAdminPathIfExists(...paths: string[]): string,
}
