import { EndpointValidationSchemas } from './IEndpointValidator';

export interface IOASParser {
    parseAndValidateSchema(): Promise<void>;
    getValidationSchemasForEndpoint(endpoint: string): EndpointValidationSchemas;
    getAllValidationSchemas(): { [endpoint: string]: EndpointValidationSchemas };
}
