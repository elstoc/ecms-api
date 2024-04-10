import { EndpointValidationError } from '../errors';
import { EndpointData, IEndpointValidator } from '../api';
import { RequestHandler } from './types';

export const createValidateRequestMiddleware = (endpointValidator: IEndpointValidator): RequestHandler => (req, res, next) => {
    const data: EndpointData = {
        requestBody: req.body,
        pathParams: req.params,
        queryParams: req.query
    };
    const errors = endpointValidator.validateEndpoint(req.method, req.path, data);
    if (errors.length > 0) {
        console.log(JSON.stringify(errors));
        throw new EndpointValidationError('endpoint validation failed', errors);
    }
    next?.();
};
