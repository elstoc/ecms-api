/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotFoundError } from '../../../src/errors';
import { EndpointValidator } from '../../../src/utils/site/EndpointValidator';
import { IEndpointValidator } from '../../../src/utils/site/IEndpointValidator';
import { ObjectValidationSchema } from '../../../src/utils/site/IOASParser';

describe('EndpointValidator', () => {
    it('throws NotFoundError if the endpoint to be validated does not exist in the specification', () => {
        const validator = new EndpointValidator({ '/some/path': {} });

        expect(() => validator.validateEndpoint('/some/other/path', {})).toThrow(new NotFoundError('no validation schema for /some/other/path'));
    });

    describe('fails validation when', () => {
        it.each([
            ['undefined', undefined],
            ['an empty object', {}]
        ])('request body is required but not present (%s)', (desc, requestBody) => {
            const requestBodySchema = { } as any;
            const validator = new EndpointValidator({ '/some/path': { requestBodyRequired: true, requestBodySchema } });

            const errors = validator.validateEndpoint('/some/path', { requestBody });

            expect(errors).toContainEqual({ property: 'requestBody', error: 'required but not present' });
        });

        it('path, query and requestBody objects exist but have no validation schema', () => {
            const validator = new EndpointValidator({ '/some/path': {} });
            const requestBody = { 'a': 'b' }, pathParams = { 'a': 'b' }, queryParams = { 'a': 'b' };

            const errors = validator.validateEndpoint('/some/path', { requestBody, pathParams, queryParams });

            expect(errors).toContainEqual({ property: 'requestBody', error: 'unexpected requestBody' });
            expect(errors).toContainEqual({ property: 'pathParams', error: 'unexpected pathParams' });
            expect(errors).toContainEqual({ property: 'queryParams', error: 'unexpected queryParams' });
        });

        describe('an object to be validated', () => {
            let validator: IEndpointValidator;

            beforeEach(() => {
                const requestBodySchema: ObjectValidationSchema = {
                    type: 'object',
                    fullPath: 'requestBody',
                    required: ['field1', 'field2', 'field3'],
                    properties: {
                        field1: { type: 'string', fullPath: 'requestBody.field1' },
                        field2: { type: 'string', fullPath: 'requestBody.field2' },
                        field3: { type: 'string', fullPath: 'requestBody.field3' },
                        field4: { type: 'string', fullPath: 'requestBody.field4', enum: ['X','Y'] },
                        field5: { type: 'integer', fullPath: 'requestBody.field5' },
                        field6: { type: 'integer', fullPath: 'requestBody.field6', minimum: 10 },
                        field7: {
                            type: 'object', fullPath: 'requestBody.field7', additionalProperties: false,
                            properties: { field8: { type: 'integer', fullPath: 'requestBody.field7.field8' } }
                        }
                    },
                    additionalProperties: false
                };

                validator = new EndpointValidator({ '/some/path': { requestBodySchema } });
            });

            it('is not an object', () => {
                const errors = validator.validateEndpoint('/some/path', { requestBody: 'not-an-object' } as any);
    
                expect(errors).toContainEqual({ property: 'requestBody', error: 'invalid data type - object expected' });
            });

            it('has required fields that are not present', () => {
                const errors = validator.validateEndpoint('/some/path', { requestBody: { field1: 'something' } } as any);
    
                expect(errors).toContainEqual({ property: 'requestBody.field2', error: 'required field is not present' });
                expect(errors).toContainEqual({ property: 'requestBody.field3', error: 'required field is not present' });
            });

            it('does not allow additional properties but some are present in the object', () => {
                const requestBody = {
                    field1: 'something', field2: 'something', field3: 'something', fieldX: 'something', fieldY: 'something'
                };
                const errors = validator.validateEndpoint('/some/path', { requestBody } as any);
    
                expect(errors).toContainEqual({ property: 'requestBody.fieldX', error: 'field is not permitted' });
                expect(errors).toContainEqual({ property: 'requestBody.fieldY', error: 'field is not permitted' });
            });

            describe('expects a field to be a string', () => {
                it('that is not a string', () => {
                    const requestBody = {
                        field1: 'something', field2: 'something', field3: 'something',
                        field4: 2
                    };
                    const errors = validator.validateEndpoint('/some/path', { requestBody } as any);

                    expect(errors).toContainEqual({ property: 'requestBody.field4', error: 'invalid data type - string expected' });
                });

                it('that is not one of the defined enum values', () => {
                    const requestBody = {
                        field1: 'something', field2: 'something', field3: 'something',
                        field4: 'Z'
                    };
                    const errors = validator.validateEndpoint('/some/path', { requestBody } as any);

                    expect(errors).toContainEqual({ property: 'requestBody.field4', error: 'value must be one of [X,Y]' });
                });
            });

            describe('expects a field to be an integer', () => {
                it('that is not a number', () => {
                    const requestBody = {
                        field1: 'something', field2: 'something', field3: 'something',
                        field5: 'Z'
                    };
                    const errors = validator.validateEndpoint('/some/path', { requestBody } as any);

                    expect(errors).toContainEqual({ property: 'requestBody.field5', error: 'invalid data type - integer expected' });
                });

                it('that is a number but not an integer', () => {
                    const requestBody = {
                        field1: 'something', field2: 'something', field3: 'something',
                        field5: 3.14159265
                    };
                    const errors = validator.validateEndpoint('/some/path', { requestBody } as any);

                    expect(errors).toContainEqual({ property: 'requestBody.field5', error: 'invalid data type - integer expected' });
                });

                it('that has a value less than the defined minimum', () => {
                    const requestBody = {
                        field1: 'something', field2: 'something', field3: 'something',
                        field6: 9
                    };
                    const errors = validator.validateEndpoint('/some/path', { requestBody } as any);

                    expect(errors).toContainEqual({ property: 'requestBody.field6', error: 'integer must be less than 10' });
                });
            });

            describe('expects a field to be an object (some examples)', () => {
                it('that (e.g.) is not an object', () => {
                    const requestBody = {
                        field1: 'something', field2: 'something', field3: 'something',
                        field7: 9
                    };
                    const errors = validator.validateEndpoint('/some/path', { requestBody } as any);

                    expect(errors).toContainEqual({ property: 'requestBody.field7', error: 'invalid data type - object expected' });
                });

                it('that (e.g.) field to be an integer field that is not a number', () => {
                    const requestBody = {
                        field1: 'something', field2: 'something', field3: 'something',
                        field7: { field8: 'X' }
                    };
                    const errors = validator.validateEndpoint('/some/path', { requestBody } as any);

                    expect(errors).toContainEqual({ property: 'requestBody.field7.field8', error: 'invalid data type - integer expected' });
                });
            });
        });
    });

    describe('passes validation (returns no errors) when', () => {
        it('there are no endpoint (path, query, requestBody) objects and no schemas for them', () => {
            const validator = new EndpointValidator({ '/some/path': {} });

            const errors = validator.validateEndpoint('/some/path', {});

            expect(errors).toEqual([]);
        });

        it('valid pathParams, queryParams and a complex requestBody are submitted', () => {
            const requestBodySchema = {
                type: 'object',
                fullPath: 'requestBody',
                required: ['field1', 'field2'],
                properties: {
                    field1: { type: 'string', fullPath: 'requestBody.field1', enum: ['X','Y'] },
                    field2: { type: 'integer', fullPath: 'requestBody.field2', minimum: 10 },
                    field3: { type: 'string', fullPath: 'requestBody.field3' },
                    field4: {
                        type: 'object', fullPath: 'requestBody.field4', additionalProperties: true,
                        properties: { field5: { type: 'integer', fullPath: 'requestBody.field4.field5' } }
                    }
                },
                additionalProperties: false
            } as any;
            const pathParamsSchema = {
                type: 'object',
                fullPath: 'path',
                required: ['fieldX'],
                additionalProperties: false,
                properties: {
                    fieldX: { type: 'string', fullPath: 'path.fieldX' }
                }
            } as any;
            const queryParamsSchema = pathParamsSchema;

            const requestBody = {
                field1: 'X',
                field2: 11,
                field3: 'test',
                field4: {
                    field5: 99
                }
            } as any;
            const pathParams = { fieldX: 'some-string' } as any;
            const queryParams = pathParams;

            const validator = new EndpointValidator({ '/some/path': { requestBodySchema, pathParamsSchema, queryParamsSchema} });

            const errors = validator.validateEndpoint('/some/path', { requestBody, pathParams, queryParams });

            expect(errors).toEqual([]);
        });
    });
});
