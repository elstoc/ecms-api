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
    validateEndpoint(endpoint: string, endpointData: EndpointData): ValidationError[];
}
