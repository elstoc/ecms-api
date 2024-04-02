export type ObjectValidationSchema = {
    type: 'object';
    fullPath: string;
    required?: string[];
    properties: { [key: string]: ValidationSchema };
    additionalProperties: boolean;
}

export type StringValidationSchema = {
    type: 'string';
    fullPath: string;
    enum?: string[];
}

export type IntegerValidationSchema = {
    type: 'integer';
    fullPath: string;
    minimum?: number;
}

export type ValidationSchema = ObjectValidationSchema | StringValidationSchema | IntegerValidationSchema;

export type EndpointParameterValidationSchema = {
    pathParamsSchema?: ObjectValidationSchema;
    queryParamsSchema?: ObjectValidationSchema;
}

export type EndpointRequestBodyValidationSchema = {
    requestBodySchema?: ObjectValidationSchema;
    requestBodyRequired?: boolean;
}

export type EndpointValidationSchemas = EndpointParameterValidationSchema & EndpointRequestBodyValidationSchema;

export interface IOASParser {
    parseAndValidateSchema(): Promise<void>;
    getValidationSchemasForEndpoint(endpoint: string): EndpointValidationSchemas;
}
