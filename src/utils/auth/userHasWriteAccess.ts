import { User } from '../../services';

export const userHasWriteAccess = (user?: User, allowWrite?: string): boolean => {
    const userRoles = user?.roles ?? [];
    return Boolean(userRoles.includes('admin') || (allowWrite && userRoles.includes(allowWrite)));
};
