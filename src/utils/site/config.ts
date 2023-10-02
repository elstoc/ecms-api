const getStringConfig = (key: string): string => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Environment variable ${key} not found`);
    }
    return value;
};

const getIntConfig = (key: string): number => {
    const value = getStringConfig(key);
    const numericValue = parseInt(value);
    if (!Number.isInteger(numericValue)) {
        throw new Error(`Environment variable ${key} is not a number`);
    }
    return numericValue;
};

export type Config = {
    logLevel: string;
    url: string;
    port: number;
    uiUrl: string;
    dataDir: string;
    jwtRefreshExpires: string;
    jwtAccessExpires: string;
    jwtRefreshSecret: string;
    jwtAccessSecret: string;
};

export const getConfig = (): Config => {
    return {
        logLevel: getStringConfig('LOG_LEVEL'),
        url: getStringConfig('URL'),
        port: getIntConfig('PORT'),
        uiUrl: getStringConfig('URL'),
        dataDir: getStringConfig('DATA_DIR'),
        jwtRefreshExpires: getStringConfig('JWT_REFRESH_EXPIRES'),
        jwtAccessExpires: getStringConfig('JWT_ACCESS_EXPIRES'),
        jwtRefreshSecret: getStringConfig('JWT_REFRESH_SECRET'),
        jwtAccessSecret: getStringConfig('JWT_ACCESS_SECRET'),
    };
};
