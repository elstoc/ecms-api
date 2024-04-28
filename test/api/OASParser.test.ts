/* eslint-disable @typescript-eslint/no-explicit-any */
import RefParser from '@apidevtools/json-schema-ref-parser';
import { OASParser, IOASParser } from '../../src/api';
import { OASParsingError } from '../../src/errors';

jest.mock('@apidevtools/json-schema-ref-parser', () => ({
    dereference: jest.fn()
}));

const dereferenceMock = RefParser.dereference as jest.Mock;

const buildOASSchema = (pathName: string, method: string, parameters: any, requestBody: any): any => {
    return {
        paths: {
            [pathName]: {
                [method]: {
                    description: 'some-description',
                    parameters,
                    requestBody
                }
            }
        }
    };
};

describe('OASParser.parseAndValidateSchema', () => {
    let oasParser: IOASParser;

    beforeEach(() => {
        oasParser = new OASParser('/path/to/api.spec.yaml');
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('throws OASParsingError when', () => {
        describe('in the overall specification', () => {
            it.each([
                ['empty spec object', {}],
                ['empty path object', { paths: {} }]
            ])('there are no api paths (%s)', async (type: string, spec: unknown) => {
                dereferenceMock.mockResolvedValue(spec);
                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('no API paths in /path/to/api.spec.yaml'));
            });
        
            it.each([
                ['contains invalid character', '/path/to/som£/thing'],
                ['contains invalid character', '/path/to/som*/thing'],
                ['contains unclosed curly bracket', '/path/to/{some/thing'],
                ['contains unopened curly bracket', '/path/to/some}/thing']
            ])('a path has an invalid name (%s)', async (desc, path) => {
                const dereferencedSchema = { paths: { [path]: { 'get': { description: 'foo' } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError(`invalid path name for endpoint get:${path}`));
            });

            it('a path has no methods', async () => {
                const dereferencedSchema = { paths: { '/some/path': {} } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('no methods for path /some/path'));
            });
        
            it('a path has an invalid method', async () => {
                const dereferencedSchema = { paths: { '/some/path': { 'foo': {} } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('invalid method foo for path /some/path'));
            });

            it('a valid endpoint has no definition', async () => {
                const dereferencedSchema = { paths: { '/some/path': { 'get': {} } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('no definition for endpoint get:/some/path'));
            });
        });

        describe('the request body', () => {
            it.each([
                ['no content', { description: 'something' }],
                ['no application/json', { content: {} }],
                ['no schema', { content: { 'application/json': {} }}]
            ])('has no schema (%s)', async (desc, requestBody) => {
                const dereferencedSchema = { paths: { '/some/path': { 'post': { requestBody } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('bad requestBody for endpoint post:/some/path'));
            });

            it.each([
                ['non-existent type', { description: 'foo' }],
                ['non-object type', { type: 'string' }]
            ])('does not have an object schema type (%s)', async (desc, schema) => {
                const dereferencedSchema = { paths: { '/some/path': { 'post': { requestBody: { content: { 'application/json': { schema: schema } } } } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError("requestBody schema at endpoint post:/some/path must have an 'object' schema type"));
            });
        });

        describe('the parameter list', () => {
            it('is not an array', async () => {
                const dereferencedSchema = { paths: { '/some/path': { 'post': { parameters: 'foo' } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('bad parameter list at endpoint post:/some/path'));
            });

            it('is an empty array', async () => {
                const dereferencedSchema = { paths: { '/some/path': { 'post': { parameters: [] } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('bad parameter list at endpoint post:/some/path'));
            });
        });

        describe('a parameter definition', () => {
            it('contains an empty record', async () => {
                const dereferencedSchema = { paths: { '/some/path': { 'delete': { parameters: [{}] } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);
    
                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('invalid path/query parameters for endpoint delete:/some/path'));
            });
    
            it('contains an invalid "in" type', async () => {
                const dereferencedSchema = { paths: { '/some/path': { 'put': { parameters: [{ in: 'parth' }] } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);
    
                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError("invalid parameter type ('in' value) in path/query parameters for endpoint put:/some/path"));
            });
        });

        describe.each([
            'query',
            'path'
        ])('a %s parameter definition', (inParam) => {
            it('has no name', async () => {
                const dereferencedSchema = { paths: { '/some/path': { 'put': { parameters: [{ in: inParam }] } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError(`missing or invalid name for one or more ${inParam} parameters in endpoint put:/some/path`));
            });

            it('has an empty name', async () => {
                const dereferencedSchema = { paths: { '/some/path': { 'put': { parameters: [{ in: inParam, name: '' }] } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError(`missing or invalid name for one or more ${inParam} parameters in endpoint put:/some/path`));
            });

            it('has a numeric name', async () => {
                const dereferencedSchema = { paths: { '/some/path': { 'put': { parameters: [{ in: inParam, name: 3 }] } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError(`missing or invalid name for one or more ${inParam} parameters in endpoint put:/some/path`));
            });

            it('has a repeated name', async () => {
                const fooProp = { in: inParam, name: 'foo', schema: { type: 'string' } };
                const dereferencedSchema = { paths: { '/some/path': { 'put': { parameters: [fooProp, fooProp] } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError(`duplicate ${inParam} parameter foo in endpoint put:/some/path`));
            });

            it('has no schema', async () => {
                const dereferencedSchema = { paths: { '/some/path': { 'put': { parameters: [{ in: inParam, name: 'some-name' }] } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError(`no schema for some-name in ${inParam} parameters in endpoint put:/some/path`));
            });

            it('has an empty schema', async () => {
                const dereferencedSchema = { paths: { '/some/path': { 'put': { parameters: [{ in: inParam, name: 'some-name', schema: {} }] } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError(`no schema for some-name in ${inParam} parameters in endpoint put:/some/path`));
            });

            it('has an object schema', async () => {
                const dereferencedSchema = { paths: { '/some/path': { 'put': { parameters: [{ in: inParam, name: 'some-name', schema: { type: 'object' } }] } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError(`object-type schema is defined for some-name in ${inParam} parameters in endpoint put:/some/path`));
            });
        });

        describe('a path parameter', () => {
            it('is repeated by name within the endpoint path', async () => {
                const dereferencedSchema = { paths: { '/some/{somename}/path/{somename}': { 'put': { parameters: [{ in: 'path', name: 'somename', schema: { type: 'string' } }] } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('repeated path parameters in endpoint put:/some/{somename}/path/{somename}'));
            });

            it('exists in the endpoint path but not in the OAS parameter list', async () => {
                const dereferencedSchema = { paths: { '/some/path/{somename}': { 'put': { parameters: [{ in: 'query', name: 'somename', schema: { type: 'string' } }] } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('path parameter somename is defined in endpoint name (put:/some/path/{somename}) but not in the OAS parameter list'));
            });

            it('exists in the OAS parameter list but not in the endpoint path', async () => {
                const dereferencedSchema = { paths: { '/some/path': { 'put': { parameters: [{ in: 'path', name: 'somename', schema: { type: 'string' } }] } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('path parameter somename is defined in the OAS parameter list but not in the endpoint name (put:/some/path)'));
            });

            it('has an array-type schema', async () => {
                const dereferencedSchema = { paths: { '/some/path': { 'put': { parameters: [{ in: 'path', name: 'somename', schema: { type: 'array' } }] } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('array-type schema is not allowed for somename in path parameters in endpoint put:/some/path'));
            });
        });

        describe('a query parameter has an array-type schema', () => {
            it.each([
                ['explode true', true, 'pipeDelimited'],
                ['explode undefined', undefined, 'pipeDelimited'],
                ['style not pipeDelimited', true, 'notPipeDelimited'],
                ['style undefined', true, undefined],
            ])('with incorrect OAS explode/style parameters (%s)', async (desc, style, explode) => {
                const dereferencedSchema = { paths: { '/some/path': { 'put': { parameters: [{ in: 'query', name: 'somename', style, explode, schema: { type: 'array', items: { type: 'string '} } }] } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError("array-type schema for somename in query parameters for endpoint put:/some/path must have explode=false and style='pipeDelimited'"));
            });

            it('with (for example) no items definition', async () => {
                const dereferencedSchema = { paths: { '/some/path': { 'put': { parameters: [{ in: 'query', name: 'somename', explode: false, style: 'pipeDelimited', schema: { type: 'array' } }] } } } };
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('array query.somename at endpoint put:/some/path has no items defined'));
            });
        });

        describe('a string schema', () => {
            it.each([
                ['has a zero-length enum', []],
                ['has an enum with numeric values', ['this', 'that', 2]]
            ])('%s', async (desc, someEnum) => {
                const parameters = [{ in: 'query', name: 'some-name', schema: { type: 'string', enum: someEnum } }];
                const dereferencedSchema = buildOASSchema('/some/path', 'put', parameters, undefined);
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('string at query.some-name for endpoint put:/some/path has an invalid enum'));
            });

            it.each([
                ['has a non-numeric minLength', 'test', 'non-integer minLength'],
                ['has a non-integer minLength', 1.3, 'non-integer minLength'],
                ['has a negative minLength', -1, 'negative minLength']
            ])('%s', async (desc, minLength, error) => {
                const parameters = [{ in: 'query', name: 'some-name', schema: { type: 'string', minLength } }];
                const dereferencedSchema = buildOASSchema('/some/path', 'put', parameters, undefined);
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError(`string at query.some-name for endpoint put:/some/path has a ${error}`));
            });
        });

        describe('an integer schema', () => {
            it.each(['x', 3.1416])('has a non-integer minimum value (%s)', async (minimum) => {
                const parameters = [{ in: 'query', name: 'some-name', schema: { type: 'integer', minimum } }];
                const dereferencedSchema = buildOASSchema('/some/path', 'put', parameters, undefined);
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('integer at query.some-name for endpoint put:/some/path has a non-integer minimum'));
            });
        });

        describe('an array schema', () => {
            it.each([
                ['is a string', 'a-string'],
                ['is undefined', undefined]
            ])('has a non-object items entry (%s)', async (desc, items) => {
                const schema = { type: 'object', properties: { aProp: { type: 'array', items } } };
                const requestBody = { content: { 'application/json': { schema } } };
                const dereferencedSchema = buildOASSchema('/some/path', 'put', undefined, requestBody);
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('array requestBody.aProp at endpoint put:/some/path has no items defined'));
            });

            it.each([
                ['is a string', 'a-string'],
                ['is a decimal', 4.2],
                ['is zero', 0],
                ['is less than zero', -1]
            ])('has an invalid minItems value (%s)', async (desc, minItems) => {
                const schema = { type: 'object', properties: { aProp: { type: 'array', items: { type: 'string' }, minItems } } };
                const requestBody = { content: { 'application/json': { schema } } };
                const dereferencedSchema = buildOASSchema('/some/path', 'put', undefined, requestBody);
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('array requestBody.aProp at endpoint put:/some/path has a bad minItems value'));
            });

            it('has an items entry with no type', async () => {
                const schema = { type: 'object', properties: { aProp: { type: 'array', items: { description: 'boo' } } } };
                const requestBody = { content: { 'application/json': { schema } } };
                const dereferencedSchema = buildOASSchema('/some/path', 'put', undefined, requestBody);
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('invalid type for requestBody.aProp.items at endpoint put:/some/path'));
            });

            it('has an items entry with an invalid type', async () => {
                const schema = { type: 'object', properties: { aProp: { type: 'array', items: { description: 'boo', type: 'invalid-type' } } } };
                const requestBody = { content: { 'application/json': { schema } } };
                const dereferencedSchema = buildOASSchema('/some/path', 'put', undefined, requestBody);
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('invalid type for requestBody.aProp.items at endpoint put:/some/path'));
            });
        });

        describe('an object schema (e.g. requestBody)', () => {
            it.each([
                ['does not have any properties', { type: 'object', additionalProperties: false }],
                ['has an empty properties object', { type: 'object', additionalProperties: false, properties: {} }]
            ])('%s when additional properties are not permitted', async (description, schema) => {
                const requestBody = { content: { 'application/json': { schema } } };
                const dereferencedSchema = buildOASSchema('/some/path', 'put', undefined, requestBody);
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('object requestBody at endpoint put:/some/path has no properties'));
            });

            it.each([
                ['includes a property with no schema', {} ],
                ['includes a property with an empty schema', undefined]
            ])('%s', async (description, property) => {
                const requestBody = { content: { 'application/json': { schema: { type: 'object', properties: { foo: property } } } } };
                const dereferencedSchema = buildOASSchema('/some/path', 'put', undefined, requestBody);
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('property requestBody.foo at endpoint put:/some/path has no schema'));
            });

            it.each([
                ['has an empty required list', []],
                ['has a non-array required list', 'foo']
            ])('%s', async (description, required) => {
                const requestBody = { content: { 'application/json': { schema: { type: 'object', required, properties: { foo: { type: 'string' } } } } } };
                const dereferencedSchema = buildOASSchema('/some/path', 'put', undefined, requestBody);
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('invalid required property list at requestBody in endpoint put:/some/path'));
            });

            it('has a required property that is not in the properties list', async () => {
                const requestBody = { content: { 'application/json': { schema: { type: 'object', required: ['foo'], properties: { bar: { type: 'string' } } } } } };
                const dereferencedSchema = buildOASSchema('/some/path', 'put', undefined, requestBody);
                dereferenceMock.mockResolvedValue(dereferencedSchema);

                await expect(oasParser.parseOAS())
                    .rejects.toThrow(new OASParsingError('required property foo in requestBody at endpoint put:/some/path is not present in properties list'));
            });
        });
    });

    describe('builds a valid validation schema', () => {
        it('strips extraneous fields from a complex requestBody schema and adds fullPath', async () => {
            const oasSchema = {
                type: 'object',
                additionalProperties: false,
                description: 'some-description',
                properties: {
                    field1: { type: 'string', description: 'some-description', minLength: 1 },
                    field2: { type: 'integer', description: 'some-description' },
                    field3: {
                        type: 'object',
                        required: ['field4', 'field5'],
                        properties: {
                            field4: { type: 'string', enum: ['value1', 'value2'], description: 'some-description' },
                            field5: { type: 'integer', minimum: 4, description: 'some-description' },
                            field6: { type: 'object', additionalProperties: true }
                        }
                    },
                    field7: { type: 'array', items: { type: 'string' } },
                    field8: { type: 'array', items: { type: 'integer' }, minItems: 1 },
                }
            };
            const oasRequestBody = { required: true, content: { 'application/json': { schema: oasSchema } } };
            const dereferencedSchema = buildOASSchema('/some/path', 'put', undefined, oasRequestBody);
            dereferenceMock.mockResolvedValue(dereferencedSchema);

            const { requestBodySchema , requestBodyRequired } = (await oasParser.parseOAS())['put:/some/path'];

            const expectedValidationSchema = {
                type: 'object',
                additionalProperties: false,
                fullPath: 'requestBody',
                properties: {
                    field1: { type: 'string', fullPath: 'requestBody.field1', minLength: 1 },
                    field2: { type: 'integer', fullPath: 'requestBody.field2' },
                    field3: {
                        type: 'object',
                        additionalProperties: true,
                        fullPath: 'requestBody.field3',
                        required: ['field4', 'field5'],
                        properties: {
                            field4: { type: 'string', enum: ['value1', 'value2'], fullPath: 'requestBody.field3.field4' },
                            field5: { type: 'integer', minimum: 4, fullPath: 'requestBody.field3.field5' },
                            field6: { type: 'object', fullPath: 'requestBody.field3.field6', additionalProperties: true, properties: {} }
                        }
                    },
                    field7: { type: 'array', fullPath: 'requestBody.field7', itemSchema: { type: 'string', fullPath: 'requestBody.field7.items' } },
                    field8: { type: 'array', fullPath: 'requestBody.field8', itemSchema: { type: 'integer', fullPath: 'requestBody.field8.items' }, minItems: 1 },
                }
            };
            expect(requestBodySchema).toEqual(expectedValidationSchema);
            expect(requestBodyRequired).toBe(true);
        });

        it('creates a query validation object from query parameters', async () => {
            const parameters = [
                { name: 'field1', description: 'some-description', in: 'query', required: true, schema: { type: 'string', enum: ['value1'] } },
                { name: 'field2', description: 'some-description', in: 'query', schema: { type: 'string', minLength: 1 } },
                { name: 'field3', description: 'some-description', in: 'query', required: true, schema: { type: 'integer', minimum: 0 } },
                { name: 'field4', description: 'some-description', in: 'query', schema: { type: 'integer' } },
                { name: 'field5', description: 'some-description', in: 'query', explode: false, style: 'pipeDelimited', schema: { type: 'array', minItems: 1, items: { type: 'string' } } }
            ];
            const dereferencedSchema = buildOASSchema('/some/path', 'get', parameters, undefined);
            dereferenceMock.mockResolvedValue(dereferencedSchema);

            const { queryParamsSchema, pathParamsSchema } = (await oasParser.parseOAS())['get:/some/path'];

            const expectedQueryParams = {
                type: 'object',
                additionalProperties: false,
                fullPath: 'query',
                required: ['field1', 'field3'],
                properties: {
                    field1: { type: 'string', fullPath: 'query.field1', enum: ['value1'] },
                    field2: { type: 'string', fullPath: 'query.field2', minLength: 1 },
                    field3: { type: 'integer', fullPath: 'query.field3', minimum: 0 },
                    field4: { type: 'integer', fullPath: 'query.field4' },
                    field5: {
                        type: 'array', fullPath: 'query.field5', minItems: 1, pipeDelimitedString: true,
                        itemSchema: { type: 'string', fullPath: 'query.field5.items' }
                    }
                }
            };

            expect(queryParamsSchema).toEqual(expectedQueryParams);
            expect(pathParamsSchema).toBeUndefined();
        });

        it('creates a path validation object from path parameters', async () => {
            const parameters = [
                { name: 'field1', description: 'some-description', in: 'path', required: true, schema: { type: 'string', enum: ['value1'] } },
                { name: 'field2', description: 'some-description', in: 'path', schema: { type: 'string' } },
                { name: 'field3', description: 'some-description', in: 'path', required: true, schema: { type: 'integer',  minimum: 0 } },
                { name: 'field4', description: 'some-description', in: 'path', schema: { type: 'integer' } }
            ];
            const dereferencedSchema = buildOASSchema('/some/{field1}/path/{field2}/{field3}/{field4}', 'get', parameters, undefined);
            dereferenceMock.mockResolvedValue(dereferencedSchema);

            const { queryParamsSchema, pathParamsSchema } = (await oasParser.parseOAS())['get:/some/{field1}/path/{field2}/{field3}/{field4}'];

            const expectedPathParams = {
                type: 'object',
                additionalProperties: false,
                fullPath: 'path',
                required: ['field1', 'field3'],
                properties: {
                    field1: { type: 'string', fullPath: 'path.field1', enum: ['value1'] },
                    field2: { type: 'string', fullPath: 'path.field2' },
                    field3: { type: 'integer', fullPath: 'path.field3', minimum: 0 },
                    field4: { type: 'integer', fullPath: 'path.field4' } }
            };

            expect(pathParamsSchema).toEqual(expectedPathParams);
            expect(queryParamsSchema).toBeUndefined();
        });

        it('creates a complete set of validation objects where requestBody, query and path params are present', async () => {
            const oasBodySchema = {
                type: 'object',
                description: 'some-description',
                properties: {
                    field1: { type: 'string', description: 'some-description' },
                    field2: { type: 'integer', description: 'some-description' },
                }
            };
            const oasParameters = [
                { name: 'field1', description: 'some-description', required: true, in: 'query', schema: { type: 'string' } },
                { name: 'field2', description: 'some-description', in: 'query', schema: { type: 'string' } },
                { name: 'field3', description: 'some-description', required: true, in: 'path', schema: { type: 'integer' } },
                { name: 'field4', description: 'some-description', in: 'path', schema: { type: 'integer' } }
            ];
            const oasRequestBody = { content: { 'application/json': { schema: oasBodySchema } } };
            const dereferencedSchema = buildOASSchema('/some/path/{field3}/{field4}', 'put', oasParameters, oasRequestBody);
            dereferenceMock.mockResolvedValue(dereferencedSchema);

            const { requestBodySchema, requestBodyRequired, queryParamsSchema, pathParamsSchema } = (await oasParser.parseOAS())['put:/some/path/{field3}/{field4}'];

            const expectedBodyValidationSchema = {
                type: 'object',
                additionalProperties: true,
                fullPath: 'requestBody',
                properties: {
                    field1: { type: 'string', fullPath: 'requestBody.field1' },
                    field2: { type: 'integer', fullPath: 'requestBody.field2' },
                }
            };
            const expectedQueryParams = {
                type: 'object',
                additionalProperties: false,
                fullPath: 'query',
                required: ['field1'],
                properties: {
                    field1: { type: 'string', fullPath: 'query.field1' },
                    field2: { type: 'string', fullPath: 'query.field2' },
                }
            };
            const expectedPathParams = {
                type: 'object',
                additionalProperties: false,
                fullPath: 'path',
                required: ['field3'],
                properties: {
                    field3: { type: 'integer', fullPath: 'path.field3' },
                    field4: { type: 'integer', fullPath: 'path.field4' } }
            };

            expect(requestBodySchema).toEqual(expectedBodyValidationSchema);
            expect(requestBodyRequired).toBe(false);
            expect(queryParamsSchema).toEqual(expectedQueryParams);
            expect(pathParamsSchema).toEqual(expectedPathParams);
        });
    });
});
