import { ComponentMetadata } from './ISiteComponent';

export interface ISite {
    getNavData(): ComponentMetadata[];
}
