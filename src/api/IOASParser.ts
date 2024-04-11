import { EndpointValidationSchemas } from './IEndpointValidator';

export interface IOASParser {
    parseOAS(): Promise<{ [endpoint: string]: EndpointValidationSchemas }>;
}
