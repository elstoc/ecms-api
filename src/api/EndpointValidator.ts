import { NotFoundError } from '../errors';
import {
    EndpointValidationSchemas,
    IntegerValidationSchema,
    ObjectValidationSchema,
    StringValidationSchema,
    ValidationSchema,
    EndpointData,
    IEndpointValidator,
    ValidationError,
    ArrayValidationSchema,
} from './IEndpointValidator';
import { convertToArray, convertToRecord, isEmpty } from './objectUtils';

export class EndpointValidator implements IEndpointValidator {
    private endpointsWithPathParams: string[] = [];

    constructor(
        private validationSchemas: { [endpoint: string]: EndpointValidationSchemas }
    ) {
        const endpoints = Object.keys(validationSchemas);
        this.endpointsWithPathParams = endpoints.filter((endpoint) => endpoint.includes('{'));
    }

    public getEndpointAndPathParams(method: string, path: string): { endpoint: string, pathParams: Record<string, unknown> } {
        const trimmedPath = path.replace(/\/$/, ''); // remove any trailing slash
        const methodLower = method.toLowerCase();
        const methodAndPath = `${methodLower}:${trimmedPath}`;

        if (this.validationSchemas[methodAndPath]) {
            return { endpoint: methodAndPath, pathParams: {} };
        }

        const pathElements = trimmedPath.split('/');

        for (const endpoint of this.endpointsWithPathParams) {
            const [endpointMethod, endpointPath] = endpoint.split(':');
            const endpointPathElements = endpointPath.split('/');

            if (endpointMethod !== methodLower || pathElements.length !== endpointPathElements.length) {
                continue;
            }

            const pathParams: Record<string, unknown> = {};

            for (let i = 0; i < pathElements.length; i++) {
                const pathElement = pathElements[i];
                const endpointPathElement = endpointPathElements[i];
                const parameterName = this.getPathParamFromElement(endpointPathElement);

                if (parameterName) {
                    pathParams[parameterName] = pathElements[i];
                } else if ( pathElement !== endpointPathElement) {
                    break;
                }

                if (i === endpointPathElements.length - 1) {
                    return { endpoint, pathParams };
                }
            }
        }

        throw new NotFoundError(`${methodAndPath} not found`);
    }

    private getPathParamFromElement(element: string): string | undefined {
        const matchPathParamRx = /^\{(.*?)\}$/;
        return matchPathParamRx.exec(element)?.[1];
    }

    public validateEndpoint(endpoint: string, data: EndpointData): ValidationError[] {
        if (!this.validationSchemas[endpoint]) {
            throw new NotFoundError(`${endpoint} not found`);
        }

        const errors: ValidationError[] = [];
        const { requestBody, pathParams, queryParams } = data;
        const { requestBodyRequired, requestBodySchema, pathParamsSchema, queryParamsSchema } = this.validationSchemas[endpoint];

        if (requestBodyRequired && isEmpty(requestBody)) {
            this.pushError(errors, 'requestBody', 'required but not present');
        } else {
            this.validateEndpointObject(errors, requestBody, requestBodySchema, 'requestBody');
        }

        this.validateEndpointObject(errors, pathParams, pathParamsSchema, 'pathParams');
        this.validateEndpointObject(errors, queryParams, queryParamsSchema, 'queryParams');

        return errors;
    }

    private validateEndpointObject(errors: ValidationError[], obj: unknown, schema: ObjectValidationSchema | undefined, objectDescription: string) {
        if (schema) {
            this.validateObject(errors, obj ?? {}, schema);
        } else if (!isEmpty(obj)) {
            this.pushError(errors, objectDescription, `unexpected ${objectDescription}`);
        }
    }

    private validateValue(errors: ValidationError[], value: unknown, validationSchema: ValidationSchema) {
        if (validationSchema.type === 'string') {
            this.validateString(errors, value, validationSchema);
        } else if (validationSchema.type === 'integer') {
            this.validateInteger(errors, value, validationSchema);
        } else if (validationSchema.type === 'object') {
            this.validateObject(errors, value, validationSchema);
        } else if (validationSchema.type === 'array') {
            this.validateArray(errors, value, validationSchema);
        }
    }

    private validateArray(errors: ValidationError[], value: unknown, validationSchema: ArrayValidationSchema): void {
        const { minItems, itemSchema } = validationSchema;

        let arrayToValidate: unknown[] = [];
        try {
            arrayToValidate = convertToArray(value);
        } catch {
            this.pushError(errors, validationSchema.fullPath, 'invalid data type - array expected');
            return;
        }

        if (minItems !== undefined && arrayToValidate.length < minItems) {
            this.pushError(errors, validationSchema.fullPath, `array must contain at least ${minItems} item${minItems > 1 ? 's' : ''}`);
        }

        arrayToValidate.forEach((value, index) => {
            const fullPath = itemSchema.fullPath.replace('items', index.toString()); // reference the appropriate array index in any error
            this.validateValue(errors, value, { ...itemSchema, fullPath });
        });
    }

    private validateObject(errors: ValidationError[], value: unknown, validationSchema: ObjectValidationSchema): void {
        let objectToValidate: Record<string, unknown> = {};
        try {
            objectToValidate = convertToRecord(value, true);
        } catch {
            this.pushError(errors, validationSchema.fullPath, 'invalid data type - object expected');
            return;
        }

        if (validationSchema.required) {
            validationSchema.required.forEach((requiredField) => {
                if (!(requiredField in objectToValidate)) {
                    this.pushError(errors, validationSchema.properties[requiredField].fullPath, 'required field is not present');
                }
            });
        }

        for (const [key, value] of Object.entries(objectToValidate)) {
            if (validationSchema.properties[key]) {
                this.validateValue(errors, value, validationSchema.properties[key]);
            } else if (!validationSchema.additionalProperties) {
                this.pushError(errors, `${validationSchema.fullPath}.${key}`, 'field is not permitted');
            }
        }
    }

    private validateString(errors: ValidationError[], value: unknown, validationSchema: StringValidationSchema): void {
        const stringEnum = validationSchema.enum;
        const stringMinLength = validationSchema.minLength;

        if (typeof value !== 'string') {
            this.pushError(errors, validationSchema.fullPath, 'invalid data type - string expected');
        } else if (stringEnum && !stringEnum.includes(value)) {
            this.pushError(errors, validationSchema.fullPath, `value must be one of [${stringEnum.join(',')}]`);
        } else if (stringMinLength && value.length < stringMinLength) {
            this.pushError(errors, validationSchema.fullPath, `invalid length - expected at least ${stringMinLength} ${stringMinLength === 1 ? 'character' : 'characters'}`);
        }
    }

    private validateInteger(errors: ValidationError[], value: unknown, validationSchema: IntegerValidationSchema): void {
        const { minimum } = validationSchema;

        let valueToCheck = value;
        if (typeof value === 'string' && parseInt(value).toString() === value) {
            valueToCheck = parseInt(value);
        }

        if (typeof valueToCheck !== 'number' || !Number.isInteger(valueToCheck)) {
            this.pushError(errors, validationSchema.fullPath, 'invalid data type - integer expected');
        } else if (minimum !== undefined && valueToCheck < minimum) {
            this.pushError(errors, validationSchema.fullPath, `integer must not be less than ${minimum}`);
        }
    }

    private pushError(errors: ValidationError[], property: string, error: string): void {
        errors.push({ property, error });
    }
}
