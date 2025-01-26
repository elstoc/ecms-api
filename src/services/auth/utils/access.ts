import { User } from '..';

export const userHasWriteAccess = (user?: User, allowWrite?: string): boolean => {
    const userRoles = user?.roles ?? [];
    return Boolean(userRoles.includes('admin') || (allowWrite && userRoles.includes(allowWrite)));
};

export const userHasReadAccess = (user?: User, restrict?: string): boolean => {
    const userRoles = user?.roles ?? [];
    return userRoles.includes('admin') || !restrict || userRoles.includes(restrict);
};

export const userIsAdmin = (user?: User): boolean => {
    const userRoles = user?.roles ?? [];
    return userRoles.includes('admin');
};
