import { EndpointValidator } from '../api';
import { EndpointValidationError } from '../errors';
import { RequestHandler } from './types';

export const createValidateRequestMiddleware = (endpointValidator: EndpointValidator): RequestHandler => (req, res, next) => {
    const { endpoint, pathParams } = endpointValidator.getEndpointAndPathParams(req.method, req.path);
    const endpointParams = {
        requestBody: req.body,
        pathParams,
        queryParams: req.query
    };
    const errors = endpointValidator.validateEndpoint(endpoint, endpointParams);
    if (errors.length > 0) {
        throw new EndpointValidationError('endpoint validation failed', errors);
    }
    next?.();
};
