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
} from './IEndpointValidator';
import { convertToRecord, isEmpty } from './objectUtils';

export class EndpointValidator implements IEndpointValidator {
    constructor(
        private validationSchemas: { [endpoint: string]: EndpointValidationSchemas } = {}
    ) { }

    public validateEndpoint(endpoint: string, endpointData: EndpointData): ValidationError[] {
        const errors: ValidationError[] = [];

        if (!this.validationSchemas[endpoint.replace(/\/$/, '')]) {
            throw new NotFoundError(`${endpoint} not found`);
        }

        const { requestBody, pathParams, queryParams } = endpointData;
        const { requestBodyRequired, requestBodySchema, pathParamsSchema, queryParamsSchema } = this.validationSchemas[endpoint.replace(/\/$/, '')];

        if (requestBodyRequired && isEmpty(requestBody)) {
            this.pushError(errors, 'requestBody', 'required but not present');
        }

        this.validateEndpointObject(errors, requestBody, requestBodySchema, 'requestBody');
        this.validateEndpointObject(errors, pathParams, pathParamsSchema, 'pathParams');
        this.validateEndpointObject(errors, queryParams, queryParamsSchema, 'queryParams');

        return errors;
    }

    validateEndpointObject(errors: ValidationError[], obj: unknown, schema: ObjectValidationSchema | undefined, objectDescription: string) {
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
        } else if (validationSchema.type == 'object') {
            this.validateObject(errors, value, validationSchema);
        }
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
        const { enum: stringEnum } = validationSchema;

        if (typeof value !== 'string') {
            this.pushError(errors, validationSchema.fullPath, 'invalid data type - string expected');
            return;
        }
        if (stringEnum) {
            if (!stringEnum.includes(value)) {
                this.pushError(errors, validationSchema.fullPath, `value must be one of [${stringEnum.join(',')}]`);
            }
        }
    }

    private validateInteger(errors: ValidationError[], value: unknown, validationSchema: IntegerValidationSchema): void {
        const { minimum } = validationSchema;
        let valueToCheck = value;
        if (typeof value === 'string' && parseInt(value).toString() === value) {
            valueToCheck = parseInt(value);
        }
        //TODO: coerce string to integer if string contains only an integer
        if (typeof valueToCheck !== 'number' || !Number.isInteger(valueToCheck)) {
            this.pushError(errors, validationSchema.fullPath, 'invalid data type - integer expected');
            return;
        }
        if (typeof minimum === 'number' && valueToCheck < minimum) {
            this.pushError(errors, validationSchema.fullPath, `integer must be less than ${minimum}`);
        }
    }

    private pushError(errors: ValidationError[], property: string, error: string): void {
        errors.push({ property, error });
    }
}
