import * as dotenv from 'dotenv';

dotenv.config();

export type Config = {
    contentDir: string;
    cacheDir: string;
    port: number;
    uiSiteUrl: string;
};

export const getConfig = (): Config => {
    return {
        contentDir: process.env.CONTENT_DIR || '',
        cacheDir: process.env.CACHE_DIR || '',
        port: parseInt(process.env.PORT || '3123'),
        uiSiteUrl: process.env.UI_SITE_URL || '',
    };
};
