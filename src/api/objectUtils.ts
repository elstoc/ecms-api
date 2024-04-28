export type OptionalRecord = Record<string, unknown> | undefined;

export const convertToRecord = (obj: unknown, allowEmpty = false): Record<string, unknown> => {
    if (obj !== null && typeof obj === 'object') {
        if (allowEmpty || Object.keys(obj).length > 0) {
            return obj as Record<string, unknown>;
        }
    }
    throw new Error('unable to convert');
};

export const convertToArray = (arr: unknown): unknown[] => {
    if (Array.isArray(arr)) {
        return arr as unknown[];
    }
    throw new Error('unable to convert');
};

const getValueAtPath = (obj: unknown, paths: string[]): unknown => {
    let untypedObj = obj;
    let typedObj: Record<string, unknown> | undefined;
    for (let i= 0; i< paths.length; i++) {
        const path = paths[i];
        typedObj = convertToRecord(untypedObj);
        const value = typedObj?.[path];
        if (typeof value !== 'object' || i === (paths.length - 1)) {
            return value;
        }
        untypedObj = value;
    }
};

export const getRecordAtPath = (obj: unknown, paths: string[]): Record<string, unknown> => {
    try {
        return convertToRecord(getValueAtPath(obj, paths));
    } catch {
        throw new Error('unable to convert');
    }
};

export const convertToStringArray = (arr: unknown): string[] => {
    if (Array.isArray(arr)) {
        let allStrings = true;
        arr.forEach((entry) => {
            if (typeof entry !== 'string') {
                allStrings = false;
            }
        });
        if (arr.length > 0 && allStrings) {
            return arr as string[];
        }
    }
    throw new Error('unable to convert');
};

export const isEmpty= (obj: unknown): boolean => {
    if (obj && Object.keys(obj).length > 0) {
        return false;
    }
    return true;
};
