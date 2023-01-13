export type Config = {
    port: number;
    uiSiteUrl: string;
    contentDir: string;
    cacheDir: string;
    adminDir: string;
    jwtIssuer: string;
    jwtAudience: string;
    jwtRefreshExpires: string;
    jwtAccessExpires: string;
    jwtRefreshSecret: string;
    jwtAccessSecret: string;
};

export const getConfig = (): Config => {
    return {
        port: parseInt(process.env.PORT || '3123'),
        uiSiteUrl: process.env.UI_SITE_URL || '',
        contentDir: process.env.CONTENT_DIR || '',
        cacheDir: process.env.CACHE_DIR || '',
        adminDir: process.env.ADMIN_DIR || '',
        jwtIssuer: process.env.JWT_ISSUER || '',
        jwtAudience: process.env.JWT_AUDIENCE || '',
        jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || '',
        jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '',
        jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
        jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
    };
};
