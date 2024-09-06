export type ObjectValidationSchema = {
    type: 'object';
    nullable: boolean;
    fullPath: string;
    required?: string[];
    properties: { [key: string]: ValidationSchema };
    additionalProperties: boolean;
}

export type ArrayValidationSchema = {
    type: 'array';
    nullable: boolean;
    fullPath: string;
    itemSchema: ValidationSchema;
    minItems?: number;
    pipeDelimitedString?: boolean;
}

export type StringValidationSchema = {
    type: 'string';
    nullable: boolean;
    fullPath: string;
    enum?: string[];
    minLength?: number;
}

export type IntegerValidationSchema = {
    type: 'integer';
    nullable: boolean;
    fullPath: string;
    minimum?: number;
    maximum?: number;
}

export type ValidationSchema = ObjectValidationSchema | ArrayValidationSchema | StringValidationSchema | IntegerValidationSchema;

export type EndpointParameterValidationSchema = {
    pathParamsSchema?: ObjectValidationSchema;
    queryParamsSchema?: ObjectValidationSchema;
}

export type EndpointRequestBodyValidationSchema = {
    requestBodySchema?: ObjectValidationSchema;
    requestBodyRequired?: boolean;
}

export type EndpointValidationSchemas = EndpointParameterValidationSchema & EndpointRequestBodyValidationSchema;

export type EndpointData = {
    requestBody?: Record<string, unknown>;
    queryParams?: Record<string, unknown>;
    pathParams?: Record<string, unknown>;
}

export type ValidationError = {
    property: string;
    error: string;
}

export interface IEndpointValidator {
    validateEndpoint(endpoint: string, data: EndpointData): ValidationError[];
    getEndpointAndPathParams(method: string, path: string): { endpoint: string, pathParams: Record<string, unknown> }
}
