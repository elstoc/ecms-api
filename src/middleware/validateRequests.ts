import { EndpointValidationError } from '../errors';
import { EndpointData, IEndpointValidator } from '../api';
import { RequestHandler } from './types';

export const createValidateRequestMiddleware = (endpointValidator: IEndpointValidator): RequestHandler => (req, res, next) => {
    const { endpoint, pathParams } = endpointValidator.getEndpointAndPathParams(req.method, req.path);
    const data: EndpointData = {
        requestBody: req.body,
        pathParams,
        queryParams: req.query
    };
    const errors = endpointValidator.validateEndpoint(endpoint, data);
    if (errors.length > 0) {
        throw new EndpointValidationError('endpoint validation failed', errors);
    }
    next?.();
};
