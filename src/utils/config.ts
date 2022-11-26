export type Config = {
    contentDir: string;
    cacheDir: string;
    adminDir: string;
    port: number;
    uiSiteUrl: string;
};

export const getConfig = (): Config => {
    return {
        contentDir: process.env.CONTENT_DIR || '',
        cacheDir: process.env.CACHE_DIR || '',
        adminDir: process.env.ADMIN_DIR || '',
        port: parseInt(process.env.PORT || '3123'),
        uiSiteUrl: process.env.UI_SITE_URL || '',
    };
};
