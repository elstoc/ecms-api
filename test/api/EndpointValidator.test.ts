/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotFoundError } from '../../src/errors';
import { EndpointValidator, IEndpointValidator } from '../../src/api';

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
    
                it('is not an object', () => {
                    const requestBodySchema = {
                        type: 'object', fullPath: 'requestBody', additionalProperties: false,
                        properties: { field1: { type: 'string', fullPath: 'requestBody.field1' } }
                    } as any;

                    validator = new EndpointValidator({ 'put:/some/path': { requestBodySchema } });

                    const errors = validator.validateEndpoint('put:/some/path', { requestBody: 'not-an-object' } as any);
        
                    expect(errors).toContainEqual({ property: 'requestBody', error: 'invalid data type - object expected' });
                });
    
                it('has a required field that is not present', () => {
                    const requestBodySchema = {
                        type: 'object', fullPath: 'requestBody', additionalProperties: false,
                        required: ['field1', 'field2'],
                        properties: {
                            field1: { type: 'string', fullPath: 'requestBody.field1' },
                            field2: { type: 'string', fullPath: 'requestBody.field2' },
                        }
                    } as any;

                    validator = new EndpointValidator({ 'put:/some/path': { requestBodySchema } });

                    const errors = validator.validateEndpoint('put:/some/path', { requestBody: { field1: 'something' } } as any);
        
                    expect(errors).toContainEqual({ property: 'requestBody.field2', error: 'required field is not present' });
                });
    
                it('does not allow additional properties but one is present in the object', () => {
                    const requestBodySchema = {
                        type: 'object', fullPath: 'requestBody', additionalProperties: false,
                        properties: { field1: { type: 'string', fullPath: 'requestBody.field1' } }
                    } as any;

                    validator = new EndpointValidator({ 'put:/some/path': { requestBodySchema } });

                    const requestBody = {
                        field1: 'something', fieldX: 'something'
                    };
                    const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
        
                    expect(errors).toContainEqual({ property: 'requestBody.fieldX', error: 'field is not permitted' });
                });
    
                describe('expects a field to be a string', () => {
                    beforeEach(() => {
                        const requestBodySchema = {
                            type: 'object', fullPath: 'requestBody', additionalProperties: false,
                            properties: {
                                field1: { type: 'string', minLength: 2, fullPath: 'requestBody.field1' },
                                field2: { type: 'string', enum: ['X', 'Y'], fullPath: 'requestBody.field2' },
                            }
                        } as any;

                        validator = new EndpointValidator({ 'put:/some/path': { requestBodySchema } });
                    });

                    it('that is not a string', () => {
                        const requestBody = {
                            field1: 2
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field1', error: 'invalid data type - string expected' });
                    });
    
                    it('that is not one of the defined enum values', () => {
                        const requestBody = {
                            field2: 'Z'
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field2', error: 'value must be one of [X,Y]' });
                    });

                    it('that has a length below the defined minimum', () => {
                        const requestBody = {
                            field1: 'X'
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field1', error: 'invalid length - expected at least 2 characters' });
                    });
                });
    
                describe('expects a field to be an integer', () => {
                    beforeEach(() => {
                        const requestBodySchema = {
                            type: 'object', fullPath: 'requestBody', additionalProperties: false,
                            properties: {
                                field1: { type: 'integer', fullPath: 'requestBody.field1' },
                                field2: { type: 'integer', minimum: 10, fullPath: 'requestBody.field2' },
                            }
                        } as any;

                        validator = new EndpointValidator({ 'put:/some/path': { requestBodySchema } });
                    });

                    it('that is not a number', () => {
                        const requestBody = {
                            field1: 'something'
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field1', error: 'invalid data type - integer expected' });
                    });
    
                    it('that is a number but not an integer', () => {
                        const requestBody = {
                            field1: 3.14159265
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field1', error: 'invalid data type - integer expected' });
                    });
    
                    it('that has a value less than the defined minimum', () => {
                        const requestBody = {
                            field2: 9
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field2', error: 'integer must not be less than 10' });
                    });
                });
    
                describe('expects a field to be an object (some examples)', () => {
                    beforeEach(() => {
                        const requestBodySchema = {
                            type: 'object', fullPath: 'requestBody', additionalProperties: false,
                            properties: {
                                field1: {
                                    type: 'object', fullPath: 'requestBody.field1', additionalProperties: false,
                                    properties: { field2: { type: 'integer', fullPath: 'requestBody.field1.field2' } }
                                },
                            }
                        } as any;

                        validator = new EndpointValidator({ 'put:/some/path': { requestBodySchema } });
                    });

                    it('that is not an object', () => {
                        const requestBody = {
                            field1: 'something'
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field1', error: 'invalid data type - object expected' });
                    });
    
                    it('that expects an integer field that is not a number', () => {
                        const requestBody = {
                            field1: { field2: 'X' }
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field1.field2', error: 'invalid data type - integer expected' });
                    });
                });

                describe('expects a field to be a pipe-delimited-string array', () => {
                    beforeEach(() => {
                        const requestBodySchema = {
                            type: 'object', fullPath: 'requestBody', additionalProperties: false,
                            properties: {
                                field1: {
                                    type: 'array', nullable: false, fullPath: 'requestBody.field1', pipeDelimitedString: true,
                                    itemSchema: { type: 'integer', nullable: false, fullPath: 'requestBody.field1.items' }
                                },
                            }
                        } as any;

                        validator = new EndpointValidator({ 'put:/some/path': { requestBodySchema } });
                    });

                    it('is not a string', () => {
                        const requestBody = {
                            field1: [1,2,3]
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field1', error: 'invalid data type - pipe-delimited array expected' });
                    });

                    it('contains a string element when integers are expected', () => {
                        const requestBody = {
                            field1: '1|two|3'
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field1.1', error: 'invalid data type - integer expected' });
                    });
                });

                describe('expects a field to be a non-pipe-delimited-string array', () => {
                    beforeEach(() => {
                        const requestBodySchema = {
                            type: 'object', fullPath: 'requestBody', additionalProperties: false,
                            properties: {
                                field1: {
                                    type: 'array', nullable: false, fullPath: 'requestBody.field1', minItems: 1,
                                    itemSchema: { type: 'integer', nullable: false, fullPath: 'requestBody.field1.items' }
                                },
                                field2: {
                                    type: 'array', nullable: false, fullPath: 'requestBody.field2', minItems: 2,
                                    itemSchema: { type: 'integer', nullable: false, fullPath: 'requestBody.field2.items' }
                                },
                            }
                        } as any;

                        validator = new EndpointValidator({ 'put:/some/path': { requestBodySchema } });
                    });

                    it.each([
                        ['string', 'string'],
                        ['number', 3],
                        ['undefined', undefined]
                    ])('that is not an array (%s)', (desc, arrayContent) => {
                        const requestBody = {
                            field1: arrayContent
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field1', error: 'invalid data type - array expected' });
                    });

                    it('that has element(s) with an incorrect format', () => {
                        const requestBody = {
                            field2: [1, 'two', 3]
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field2.1', error: 'invalid data type - integer expected' });
                    });

                    it('that has fewer elements than the defined minimum length (singular)', () => {
                        const requestBody = {
                            field1: []
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field1', error: 'array must contain at least 1 item' });
                    });

                    it('that has fewer elements than the defined minimum length (plural)', () => {
                        const requestBody = {
                            field2: ['item']
                        };
                        const errors = validator.validateEndpoint('put:/some/path', { requestBody } as any);
    
                        expect(errors).toContainEqual({ property: 'requestBody.field2', error: 'array must contain at least 2 items' });
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
    
            it('valid strings are provided in the requestBody', () => {
                const requestBodySchema = {
                    type: 'object', fullPath: 'requestBody', additionalProperties: false,
                    required: ['field1', 'field3'],
                    properties: {
                        field1: { type: 'string', minLength: 2, fullPath: 'requestBody.field1' },
                        field2: { type: 'string', enum: ['X', 'Y'], fullPath: 'requestBody.field2' },
                        field3: { type: 'string', nullable: true, fullPath: 'requestBody.field3' },
                        field4: { type: 'string', nullable: true, fullPath: 'requestBody.field4' },
                    }
                } as any;
                const validator = new EndpointValidator({ 'put:/some/path': { requestBodySchema } });
                const requestBody = {
                    field1: 'St', field2: 'X', field3: null, field4: undefined
                };

                const errors = validator.validateEndpoint('put:/some/path', { requestBody });

                expect(errors).toEqual([]);
            });

            it('valid integers are provided in the requestBody', () => {
                const requestBodySchema = {
                    type: 'object', fullPath: 'requestBody', additionalProperties: false,
                    required: ['field1', 'field3'],
                    properties: {
                        field1: { type: 'integer', fullPath: 'requestBody.field1' },
                        field2: { type: 'integer', minimum: 10, fullPath: 'requestBody.field2' },
                        field3: { type: 'integer', nullable: true, fullPath: 'requestBody.field3' },
                        field4: { type: 'integer', nullable: true, fullPath: 'requestBody.field4' },
                    }
                } as any;
                const validator = new EndpointValidator({ 'put:/some/path': { requestBodySchema } });
                const requestBody = {
                    field1: 1234, field2: 10, field3: null, field4: undefined
                };

                const errors = validator.validateEndpoint('put:/some/path', { requestBody });

                expect(errors).toEqual([]);
            });

            it('valid objects are provided in the request body', () => {
                const requestBodySchema = {
                    type: 'object', fullPath: 'requestBody', additionalProperties: false,
                    required: ['field1', 'field3'],
                    properties: {
                        field1: {
                            type: 'object', fullPath: 'requestBody.field1', additionalProperties: false,
                            properties: { field2: { type: 'integer', fullPath: 'requestBody.field1.field2' } }
                        },
                        field3: {
                            type: 'object', nullable: true, fullPath: 'requestBody.field3', additionalProperties: false,
                            properties: { field2: { type: 'integer', fullPath: 'requestBody.field3.field4' } }
                        },
                        field5: {
                            type: 'object', nullable: true, fullPath: 'requestBody.field5', additionalProperties: false,
                            properties: { field2: { type: 'integer', fullPath: 'requestBody.field5.field6' } }
                        }
                    }
                } as any;
                const validator = new EndpointValidator({ 'put:/some/path': { requestBodySchema } });
                const requestBody = {
                    field1: { field2: 44 }, field3: null, field5: undefined
                };

                const errors = validator.validateEndpoint('put:/some/path', { requestBody });

                expect(errors).toEqual([]);
            });

            it('valid arrays are provided in the request body', () => {
                const requestBodySchema = {
                    type: 'object', fullPath: 'requestBody', additionalProperties: false,
                    required: ['field1', 'field3'],
                    properties: {
                        field1: {
                            type: 'array', nullable: false, fullPath: 'requestBody.field1', minItems: 3,
                            itemSchema: { type: 'integer', nullable: false, fullPath: 'requestBody.field1.items' }
                        },
                        field2: {
                            type: 'array', nullable: true, fullPath: 'requestBody.field2',
                            itemSchema: { type: 'integer', nullable: false, fullPath: 'requestBody.field2.items' }
                        },
                        field3: {
                            type: 'array', nullable: true, fullPath: 'requestBody.field2',
                            itemSchema: { type: 'integer', nullable: false, fullPath: 'requestBody.field3.items' }
                        }
                    }
                } as any;
                const validator = new EndpointValidator({ 'put:/some/path': { requestBodySchema } });
                const requestBody = {
                    field1: [1, 2, 3], field2: null, field3: undefined
                };

                const errors = validator.validateEndpoint('put:/some/path', { requestBody });

                expect(errors).toEqual([]);
            });

            it('valid strings are provided in the path and query params', () => {
                const pathParamsSchema = {
                    type: 'object', fullPath: 'params', additionalProperties: false,
                    required: ['field1', 'field2'],
                    properties: {
                        field1: { type: 'string', minLength: 2, fullPath: 'params.field1' },
                        field2: { type: 'string', enum: ['X', 'Y'], fullPath: 'params.field2' },
                    }
                } as any;
                const queryParamsSchema = pathParamsSchema;
                const validator = new EndpointValidator({ 'put:/some/path': { pathParamsSchema, queryParamsSchema } });
                const pathParams = {
                    field1: 'St', field2: 'X'
                };
                const queryParams = pathParams;

                const errors = validator.validateEndpoint('put:/some/path', { pathParams, queryParams });

                expect(errors).toEqual([]);
            });

            it('valid integers are provided (as strings) in the path and query params', () => {
                const pathParamsSchema = {
                    type: 'object', fullPath: 'params', additionalProperties: false,
                    required: ['field1', 'field2'],
                    properties: {
                        field1: { type: 'integer', fullPath: 'params.field1' },
                        field2: { type: 'integer', minimum: 10, fullPath: 'params.field2' },
                    }
                } as any;
                const queryParamsSchema = pathParamsSchema;
                const validator = new EndpointValidator({ 'put:/some/path': { queryParamsSchema, pathParamsSchema } });
                const pathParams = {
                    field1: '1234', field2: '10'
                };
                const queryParams = pathParams;

                const errors = validator.validateEndpoint('put:/some/path', { pathParams, queryParams });

                expect(errors).toEqual([]);
            });

            it('valid pipe-delimited array is provided in the query params', () => {
                const queryParamsSchema = {
                    type: 'object', fullPath: 'requestBody', additionalProperties: false,
                    required: ['field1'],
                    properties: {
                        field1: {
                            type: 'array', nullable: false, fullPath: 'requestBody.field1', minItems: 3, pipeDelimitedString: true,
                            itemSchema: { type: 'integer', nullable: false, fullPath: 'requestBody.field1.items' }
                        },
                    }
                } as any;
                const validator = new EndpointValidator({ 'put:/some/path': { queryParamsSchema } });
                const queryParams = {
                    field1: '1|2|3'
                };

                const errors = validator.validateEndpoint('put:/some/path', { queryParams });

                expect(errors).toEqual([]);
            });
        });
    });
});
