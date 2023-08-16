export type Config = {
    logLevel: string;
    url: string;
    port: number;
    uiUrl: string;
    dataDir: string;
    jwtIssuer: string;
    jwtAudience: string;
    jwtRefreshExpires: string;
    jwtAccessExpires: string;
    jwtRefreshSecret: string;
    jwtAccessSecret: string;
};

export const getConfig = (): Config => {
    return {
        logLevel: process.env.LOG_LEVEL ?? 'debug',
        url: process.env.URL ?? 'http://localhost:3123',
        port: parseInt(process.env.PORT ?? '3123'),
        uiUrl: process.env.UI_URL ?? '',
        dataDir: process.env.DATA_DIR ?? '',
        jwtIssuer: process.env.JWT_ISSUER ?? '',
        jwtAudience: process.env.JWT_AUDIENCE ?? '',
        jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '',
        jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES ?? '',
        jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
        jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    };
};
