export const splitPath = (pathToSplit: string): string[] => {
    return pathToSplit
        .replace(/^\//, '')
        .replace(/\/$/, '')
        .split('/');
};
