import { ComponentMetadata } from './ISiteComponent';

export interface ISite {
    getComponentList(): ComponentMetadata[];
}
