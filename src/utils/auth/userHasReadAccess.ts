import { User } from '../../services';

export const userHasReadAccess = (user?: User, restrict?: string): boolean => {
    const userRoles = user?.roles ?? [];
    return userRoles.includes('admin') || !restrict || userRoles.includes(restrict);
};
