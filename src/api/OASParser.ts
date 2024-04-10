import RefParser from '@apidevtools/json-schema-ref-parser';

import { IOASParser } from './IOASParser';
import { OASParsingError } from '../errors';
import { convertToRecord, convertToStringArray, getRecordAtPath } from './objectUtils';
import {
    StringValidationSchema,
    IntegerValidationSchema,
    ObjectValidationSchema,
    ValidationSchema,
    EndpointValidationSchemas,
    EndpointParameterValidationSchema,
    EndpointRequestBodyValidationSchema,
} from './IEndpointValidator';
import { splitPath } from '../utils';

export class OASParser implements IOASParser {
    private validationSchemas: { [endpoint: string]: EndpointValidationSchemas } = {};

    constructor(
        private apiSpecPath: string,
    ) { }
    
    public getValidationSchemasForEndpoint(endpoint: string): EndpointValidationSchemas {
        return this.validationSchemas[endpoint];
    }

    public getAllValidationSchemas(): { [endpoint: string]: EndpointValidationSchemas } {
        return this.validationSchemas;
    }

    public async parseAndValidateSchema(): Promise<void> {
        const apiSpec = await RefParser.dereference(this.apiSpecPath);

        const oasPaths = this.getRecordAtPathOrThrow(apiSpec, ['paths'], `no API paths in ${this.apiSpecPath}`);

        for (const [path, oasPathDetails] of Object.entries(oasPaths)) {
            const oasPathDetailsRecord = this.convertToRecordOrThrow(oasPathDetails, `no methods for path ${path}`);
            for (const [endpointMethod, oasEndpointDetails] of Object.entries(oasPathDetailsRecord)) {
                if (!['get', 'put', 'post', 'delete'].includes(endpointMethod)) {
                    throw new OASParsingError(`invalid method ${endpointMethod} for path ${path}`);
                }
                const endpoint = `${endpointMethod}:${path}`;
                const oasEndpointDetailsRecord = this.convertToRecordOrThrow(oasEndpointDetails, `no definition for endpoint ${endpoint}`);
                this.validationSchemas[endpoint] = this.getEndpointValidationSchemas(endpoint, oasEndpointDetailsRecord);
            }
        }
    }

    private getEndpointValidationSchemas(endpoint: string, oasEndpointDetails: Record<string, unknown>): EndpointValidationSchemas {
        let validationParams: EndpointValidationSchemas = { };

        if (oasEndpointDetails.requestBody) {
            const oasRequestBody = this.convertToRecordOrThrow(oasEndpointDetails.requestBody, `bad requestBody for endpoint ${endpoint}`);
            validationParams = this.getRequestBodyValidationSchema(oasRequestBody, endpoint);
        }

        const pathParamsFromEndpoint = this.parseEndpointPathAndGetParams(endpoint);
        if ((new Set(pathParamsFromEndpoint)).size !== pathParamsFromEndpoint.length) {
            throw new OASParsingError(`repeated path parameters in endpoint ${endpoint}`);
        }

        if (oasEndpointDetails.parameters || pathParamsFromEndpoint.length > 0) {
            if (!Array.isArray(oasEndpointDetails.parameters) || oasEndpointDetails.parameters.length == 0) {
                throw new OASParsingError(`bad parameter list at endpoint ${endpoint}`);
            }
            validationParams = {
                ...validationParams,
                ...this.getParameterValidationSchemas(oasEndpointDetails.parameters, endpoint, pathParamsFromEndpoint)
            };
        }

        return validationParams;
    }

    private parseEndpointPathAndGetParams(endpoint: string): string[] {
        const pathParams: string[] = [];
        const validPathChars = /^[a-zA-Z0-9}{/_-]+$/;
        const matchPathParam = /^\{(.*?)\}$/;
        const pathParsingError = new OASParsingError(`invalid path name for endpoint ${endpoint}`);

        const endpointPath = endpoint.split(':')[1];
        if (!validPathChars.exec(endpointPath)) {
            throw pathParsingError;
        }

        splitPath(endpointPath).forEach((element) => {
            if (element.includes('{') || element.includes('}')) {
                const pathParam = matchPathParam.exec(element);
                if (pathParam?.[1]) {
                    pathParams.push(pathParam[1]);
                } else {
                    throw pathParsingError;
                }
            }
        });
        return pathParams;
    }

    private getRequestBodyValidationSchema(requestBody: Record<string, unknown>, endpoint: string): EndpointRequestBodyValidationSchema {
        const validationParams: EndpointValidationSchemas = { };

        const bodySchema = this.getRecordAtPathOrThrow(requestBody, ['content', 'application/json', 'schema'], `bad requestBody for endpoint ${endpoint}`);
        if (bodySchema?.type !== 'object') {
            throw new OASParsingError(`requestBody schema at endpoint ${endpoint} must have an 'object' schema type`);
        }
        validationParams.requestBodyRequired = requestBody?.required === true;
        validationParams.requestBodySchema = this.getObjectValidationSchema(bodySchema, endpoint, 'requestBody');

        return validationParams;
    }

    private getParameterValidationSchemas(oasParameters: unknown[], endpoint: string, pathParamsFromEndpoint: string[]): EndpointParameterValidationSchema {
        const validationSchemas: EndpointParameterValidationSchema = {};
        const oasPathParameters: unknown[] = [];
        const oasQueryParameters: unknown[] = [];

        oasParameters.forEach((parameterSchema) => {
            const oasParameterSchemaRecord = this.convertToRecordOrThrow(parameterSchema, `invalid path/query parameters for endpoint ${endpoint}`);
            const paramType = oasParameterSchemaRecord?.in;
            if (paramType === 'query') {
                oasQueryParameters.push(oasParameterSchemaRecord);
            } else if (paramType === 'path') {
                oasPathParameters.push(oasParameterSchemaRecord);
            } else {
                throw new OASParsingError(`invalid parameter type ('in' value) in path/query parameters for endpoint ${endpoint}`);
            }
        });

        if (oasPathParameters.length > 0 || pathParamsFromEndpoint.length > 0) {
            validationSchemas.pathParamsSchema = this.createObjectValidationSchemaFromOasParameters(oasPathParameters, endpoint, 'path');
            const pathParamsFromValidationSchema = Object.keys(validationSchemas.pathParamsSchema.properties);

            pathParamsFromValidationSchema.forEach((schemaPathParam) => {
                if (!pathParamsFromEndpoint.includes(schemaPathParam)) {
                    throw new OASParsingError(`path parameter ${schemaPathParam} is defined in the OAS parameter list but not in the endpoint name (${endpoint})`);
                }
            });

            pathParamsFromEndpoint.forEach((endpointPathParam) => {
                if (!pathParamsFromValidationSchema.includes(endpointPathParam)) {
                    throw new OASParsingError(`path parameter ${endpointPathParam} is defined in endpoint name (${endpoint}) but not in the OAS parameter list`);
                }
            });
        }
        if (oasQueryParameters.length > 0) {
            validationSchemas.queryParamsSchema = this.createObjectValidationSchemaFromOasParameters(oasQueryParameters, endpoint, 'query');
        }
        return validationSchemas;
    }

    private createObjectValidationSchemaFromOasParameters(oasEndpointParameters: unknown[], endpoint: string, pathOrQuery: string): ObjectValidationSchema {
        const returnVal: ObjectValidationSchema = {
            type: 'object',
            fullPath: pathOrQuery,
            properties: {},
            additionalProperties: false
        };

        const requiredParams: string[] = [];

        oasEndpointParameters.forEach((oasParameter) => {
            const oasParameterRecord = this.convertToRecordOrThrow(oasParameter, `bad ${pathOrQuery} parameter record in endpoint ${endpoint}`);
            const name = oasParameterRecord?.name;
            if (typeof name !== 'string' || name === '') {
                throw new OASParsingError(`missing or invalid name for one or more ${pathOrQuery} parameters in endpoint ${endpoint}`);
            }
            if (returnVal.properties[name]) {
                throw new OASParsingError(`duplicate ${pathOrQuery} parameter ${name} in endpoint ${endpoint}`);
            }
            const oasSchema = this.convertToRecordOrThrow(oasParameterRecord?.schema, `no schema for ${name} in ${pathOrQuery} parameters in endpoint ${endpoint}`);
            if (oasSchema?.type === 'object') {
                throw new OASParsingError(`object-type schema is defined for ${name} in ${pathOrQuery} parameters in endpoint ${endpoint}`);
            }
            if (oasParameterRecord?.required === true) {
                requiredParams.push(name);
            }
            returnVal.properties[name] = this.getValidationSchema(oasSchema, endpoint, `${pathOrQuery}.${name}`);
        });

        if (requiredParams.length > 0) {
            returnVal.required = requiredParams;
        }

        return returnVal;
    }

    private getValidationSchema(oasSchema: Record<string, unknown>, endpoint: string, fullPath: string): ValidationSchema {
        const type = oasSchema?.type;
        if (type === 'string') {
            return this.getStringValidationSchema(oasSchema, endpoint, fullPath);
        } else if (type === 'integer') {
            return this.getIntegerValidationSchema(oasSchema, endpoint, fullPath);
        } else if (type === 'object') {
            return this.getObjectValidationSchema(oasSchema, endpoint, fullPath);
        } else {
            throw new OASParsingError(`invalid type for ${fullPath} at endpoint ${endpoint}`);
        }
    }

    private getObjectValidationSchema(oasObjectSchema: Record<string, unknown>, endpoint: string, fullPath: string): ObjectValidationSchema {
        const objectValidationProperties: { [key: string]: ValidationSchema } = {};
        const additionalProperties = oasObjectSchema?.['additionalProperties'] !== false;
        let oasObjectProperties: Record<string, unknown> = {};

        try {
            oasObjectProperties = convertToRecord(oasObjectSchema?.properties);
        } catch {
            if (!additionalProperties) {
                throw new OASParsingError(`object ${fullPath} at endpoint ${endpoint} has no properties`);
            }
        }

        for (const [propertyName, oasPropertySchema] of Object.entries(oasObjectProperties)) {
            const propertyFullPath = `${fullPath}.${propertyName}`;
            const oasPropertySchemaRecord = this.convertToRecordOrThrow(oasPropertySchema, `property ${propertyFullPath} at endpoint ${endpoint} has no schema`);
            objectValidationProperties[propertyName] = this.getValidationSchema(oasPropertySchemaRecord, endpoint, propertyFullPath);
        }

        const validationSchema: ObjectValidationSchema = {
            type: 'object',
            fullPath,
            additionalProperties,
            properties: objectValidationProperties
        };

        if (oasObjectSchema?.required) {
            const requiredProperties = this.convertToStringArrayOrThrow(oasObjectSchema?.required, `invalid required property list at ${fullPath} in endpoint ${endpoint}`);
            const propertyList = Object.keys(objectValidationProperties);
            requiredProperties.forEach((requiredProperty) => {
                if (!propertyList.includes(requiredProperty)) {
                    throw new OASParsingError(`required property ${requiredProperty} in ${fullPath} at endpoint ${endpoint} is not present in properties list`);
                }
            });
            validationSchema.required = requiredProperties;
        }

        return validationSchema;
    }

    private getStringValidationSchema(oasStringSchema: Record<string, unknown>, endpoint: string, fullPath: string): StringValidationSchema {
        const validationSchema: StringValidationSchema = { type: 'string', fullPath };

        if (oasStringSchema.enum) {
            const enumArray = this.convertToStringArrayOrThrow(oasStringSchema.enum, `string at ${fullPath} for endpoint ${endpoint} has an invalid enum`);
            validationSchema.enum = enumArray;
        }

        return validationSchema;
    }

    private getIntegerValidationSchema(oasIntSchema: Record<string, unknown>, endpoint: string, fullPath: string): IntegerValidationSchema {
        const validationSchema: IntegerValidationSchema = { type: 'integer', fullPath };

        if (oasIntSchema.minimum !== undefined) {
            if (typeof oasIntSchema.minimum !== 'number' || !Number.isInteger(oasIntSchema.minimum)) {
                throw new OASParsingError(`integer at ${fullPath} for endpoint ${endpoint} has a non-integer minimum`);
            }
            validationSchema.minimum = oasIntSchema.minimum;
        }

        return validationSchema;
    }

    private convertToRecordOrThrow(obj: unknown, errorMessage: string): Record<string, unknown> {
        try {
            return convertToRecord(obj);
        } catch {
            throw new OASParsingError(errorMessage);
        }
    }

    private convertToStringArrayOrThrow(obj: unknown, errorMessage: string): string[] {
        try {
            return convertToStringArray(obj);
        } catch {
            throw new OASParsingError(errorMessage);
        }
    }

    private getRecordAtPathOrThrow(obj: unknown, path: string[], errorMessage: string): Record<string, unknown> {
        try {
            return getRecordAtPath(obj, path);
        } catch {
            throw new OASParsingError(errorMessage);
        }
    }
}
