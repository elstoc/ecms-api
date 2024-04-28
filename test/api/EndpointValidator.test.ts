/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotFoundError } from '../../src/errors';
import { EndpointValidator, IEndpointValidator, ObjectValidationSchema } from '../../src/api';

describe('EndpointValidator', () => {
    describe('getEndpointAndPathParams', () => {
        const endpointValidationSchemas = {
            'put:/path/to/something': { },
            'post:/path/to/something': { },
            'get:/path/to/something': { },
            'post:/path/to/something/{param1}': { },
            'post:/another/path/{param1}/boo/{param2}': { },
            'put:/another/path/{param1}/boo/{param2}': { },
            'post:/another/path/{param1}/boo': { },
            'put:/another/path/{param1}/boo': { },
        };

        let validator: IEndpointValidator;

        beforeEach(() => {
            validator = new EndpointValidator(endpointValidationSchemas);
        });

        it.each([
            ['PUT', '/path/to/something'],
            ['post', '/path/to/something'],
            ['GET', '/path/to/something'],
        ])('returns endpoint and empty params object if direct path match (%s:%s)', (method, path) => {
            const returnValue = validator.getEndpointAndPathParams(method, path);

            expect(returnValue).toEqual({
                endpoint: `${method.toLowerCase()}:${path}`, pathParams: {}
            });
        });

        it.each([
            ['post', '/path/to/something/var', 'post:/path/to/something/{param1}', { param1: 'var' }],
            ['post', '/another/path/1/boo/2', 'post:/another/path/{param1}/boo/{param2}', { param1: '1', param2: '2' }],
            ['post', '/another/path/1/boo/', 'post:/another/path/{param1}/boo', { param1: '1' }]
        ])('returns endpoint and populated params object if matches a parameterised path (%s:%s)', (method, path, expectedEndpoint, expectedParams) => {
            const { endpoint, pathParams } = validator.getEndpointAndPathParams(method, path);

            expect(endpoint).toBe(expectedEndpoint);
            expect(pathParams).toEqual(expectedParams);
        });

        it('throws NotFoundError if no matches are found', () => {
            expect(() => validator.getEndpointAndPathParams('post', '/another/path/1/boo/3/d'))
                .toThrow(new NotFoundError('post:/another/path/1/boo/3/d not found'));
        });
    });
    
    describe('validateEndpoint', () => {
        it('throws NotFoundError if the endpoint to be validated does not exist in the specification', () => {
            const validator = new EndpointValidator({ 'put:/some/path': {} });
    
            expect(() => validator.validateEndpoint('get:/some/path', {})).toThrow(new NotFoundError('get:/some/path not found'));
        });

        describe('fails validation when', () => {
            it.each([
                ['undefined', undefined],
                ['an empty object', {}]
            ])('request body is required but not present (%s)', (desc, requestBody) => {
                const requestBodySchema = { } as any;
                const validator = new EndpointValidator({ 'put:/some/path': { requestBodyRequired: true, requestBodySchema } });
    
                const errors = validator.validateEndpoint('put:/some/path', { requestBody });
    
                expect(errors).toContainEqual({ property: 'requestBody', error: 'required but not present' });
            });
    
            it('path, query and requestBody objects exist but have no validation schema', () => {
                const validator = new EndpointValidator({ 'put:/some/path': {} });
                const requestBody = { 'a': 'b' }, pathParams = { 'a': 'b' }, queryParams = { 'a': 'b' };
    
                const errors = validator.validateEndpoint('put:/some/path', { requestBody, pathParams, queryParams });
    
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
                            field3: { type: 'string', fullPath: 'requestBody.field3', minLength: 2 },
                            field4: { type: 'string', fullPath: 'requestBody.field4', enum: ['X','Y'] },
                            field5: { type: 'integer', fullPath: 'requestBody.field5' },
                            field6: { type: 'integer', fullPath: 'requestBody.field6', minimum: 10 },
                            field7: {
                                type: 'object', fullPath: 'requestBody.field7', additionalProperties: false,
                                properties: { field8: { type: 'integer', fullPath: 'requestBody.field7.field8' } }
                            },
                            field9: {
                                type: 'array', fullPath: 'requestBody.field9',
                                itemSchema: { type: 'string', fullPath: 'requestBody.field9.items' }
                            },
                            field10: {
                                type: 'array', fullPath: 'requestBody.field10', minItems: 1,
                                itemSchema: { type: 'integer', fullPath: 'requestBody.field10.items' }
                            },
                            field11: {
                                type: 'array', fullPath: 'requestBody.field11', minItems: 2,
                                itemSchema: { type: 'integer', fullPath: 'requestBody.field11.items' }
                            },
                            field12: {
                                type: 'array', fullPath: 'requestBody.field12', pipeDelimitedString: true,
                                itemSchema: { type: 'integer', fullPath: 'requestBody.field12.items' }
                            },
                        },
                        additionalProperties: false
                    };
    
                    validator = new EndpointValidator({ 'put:/some/path': { requestBodySchema } });
                });
    
                it('is not an object', () => {
                    const errors = validator.validateEndpoint('put:/some/path', { requestBody: 'not-an-object' } as any);
        
                    expect(errors).toContainEqual({ property: 'requestBody', error: 'invalid data type - object expected' });
                });
    
                it('has required fields that are not present', () => {
                    const errors = validator.validateEndpoint('put:/some/path', { requestBody: { field1: 'something' } } as any);
        
                    expect(errors).toContainEqual({ property: 'requestBody.field2', error: 'required field is not present' });
                    expect(errors).toContainEqual({ property: 'requestBody.field3', error: 'required field is not present' });
                });
    
                it('does not allow additional properties but some are present in the object', () => {
                    const requestBody = {
                        field1: 'something', field2: 'something', field3: 'something', fieldX: 'something', fieldY: 'something'
                    };
                    const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
        
                    expect(errors).toContainEqual({ property: 'requestBody.fieldX', error: 'field is not permitted' });
                    expect(errors).toContainEqual({ property: 'requestBody.fieldY', error: 'field is not permitted' });
                });
    
                describe('expects a field to be a string', () => {
                    it('that is not a string', () => {
                        const requestBody = {
                            field1: 'something', field2: 'something', field3: 'something',
                            field4: 2
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field4', error: 'invalid data type - string expected' });
                    });
    
                    it('that is not one of the defined enum values', () => {
                        const requestBody = {
                            field1: 'something', field2: 'something', field3: 'something',
                            field4: 'Z'
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field4', error: 'value must be one of [X,Y]' });
                    });

                    it('that has a length below the defined minimum', () => {
                        const requestBody = {
                            field1: 'something', field2: 'something', field3: 's',
                            field4: 'X'
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field3', error: 'invalid length - expected at least 2 characters' });
                    });
                });
    
                describe('expects a field to be an integer', () => {
                    it('that is not a number', () => {
                        const requestBody = {
                            field1: 'something', field2: 'something', field3: 'something',
                            field5: 'Z'
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field5', error: 'invalid data type - integer expected' });
                    });
    
                    it('that is a number but not an integer', () => {
                        const requestBody = {
                            field1: 'something', field2: 'something', field3: 'something',
                            field5: 3.14159265
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field5', error: 'invalid data type - integer expected' });
                    });
    
                    it('that has a value less than the defined minimum', () => {
                        const requestBody = {
                            field1: 'something', field2: 'something', field3: 'something',
                            field6: 9
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field6', error: 'integer must not be less than 10' });
                    });
                });
    
                describe('expects a field to be an object (some examples)', () => {
                    it('that (e.g.) is not an object', () => {
                        const requestBody = {
                            field1: 'something', field2: 'something', field3: 'something',
                            field7: 9
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field7', error: 'invalid data type - object expected' });
                    });
    
                    it('that (e.g.) field to be an integer field that is not a number', () => {
                        const requestBody = {
                            field1: 'something', field2: 'something', field3: 'something',
                            field7: { field8: 'X' }
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field7.field8', error: 'invalid data type - integer expected' });
                    });
                });

                describe('expects a field to be a pipe-delimited-string array', () => {
                    it('is not a string', () => {
                        const requestBody = {
                            field1: 'something', field2: 'something', field3: 'something',
                            field12: [1,2,3]
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field12', error: 'invalid data type - pipe-delimited array expected' });
                    });

                    it('contains a string element when integers are expected', () => {
                        const requestBody = {
                            field1: 'something', field2: 'something', field3: 'something',
                            field12: '1|two|3'
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field12.1', error: 'invalid data type - integer expected' });
                    });
                });

                describe('expects a field to be a non-pipe-delimited-string array', () => {
                    it.each([
                        ['string', 'string'],
                        ['number', 3],
                        ['undefined', undefined]
                    ])('that is not an array (%s)', (desc, arrayContent) => {
                        const requestBody = {
                            field1: 'something', field2: 'something', field3: 'something',
                            field10: arrayContent
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field10', error: 'invalid data type - array expected' });
                    });

                    it('that has element(s) with an incorrect format', () => {
                        const requestBody = {
                            field1: 'something', field2: 'something', field3: 'something',
                            field11: [1, 'two', 3]
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field11.1', error: 'invalid data type - integer expected' });
                    });

                    it('that has fewer elements than the defined minimum length (singular)', () => {
                        const requestBody = {
                            field1: 'something', field2: 'something', field3: 'something',
                            field10: []
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field10', error: 'array must contain at least 1 item' });
                    });

                    it('that has fewer elements than the defined minimum length (plural)', () => {
                        const requestBody = {
                            field1: 'something', field2: 'something', field3: 'something',
                            field11: ['item']
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field11', error: 'array must contain at least 2 items' });
                    });
                });
            });
        });
    
        describe('passes validation (returns no errors) when', () => {
            it('there are no endpoint (path, query, requestBody) objects and no schemas for them', () => {
                const validator = new EndpointValidator({ 'put:/some/path': {} });
    
                const errors = validator.validateEndpoint('put:/some/path', {});
    
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
                        field3: { type: 'string', fullPath: 'requestBody.field3', minLength: 1 },
                        field4: {
                            type: 'object', fullPath: 'requestBody.field4', additionalProperties: true,
                            properties: { field5: { type: 'integer', fullPath: 'requestBody.field4.field5' } }
                        },
                        field6: {
                            type: 'array', fullPath: 'requestBody.field6', minItems: 2,
                            itemSchema: { fullPath: 'requestBody.field6.items', type: 'string' }
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
                const queryParamsSchema = {
                    type: 'object',
                    fullPath: 'path',
                    required: ['fieldX'],
                    additionalProperties: false,
                    properties: {
                        fieldX: { type: 'string', fullPath: 'path.fieldX' },
                        arrayOfNumbers: {
                            type: 'array', minItems: 2, fullPath: 'query.arrayOfNumbers', pipeDelimitedString: true,
                            itemSchema: { type: 'integer', fullPath: 'query.arrayOfNumbers.items' }
                        }
                    }
                } as any;
    
                const requestBody = {
                    field1: 'X',
                    field2: 11,
                    field3: 'test',
                    field4: {
                        field5: 99
                    },
                    field6: ['item1', 'item2']
                } as any;
                const pathParams = { fieldX: 'some-string' } as any;
                const queryParams = {
                    ...pathParams, arrayOfNumbers: '1|2|3'
                };
    
                const validator = new EndpointValidator({ 'put:/some/path': { requestBodySchema, pathParamsSchema, queryParamsSchema} });
    
                const errors = validator.validateEndpoint('put:/some/path', { requestBody, pathParams, queryParams });
    
                expect(errors).toEqual([]);
            });
        });
    });
});
