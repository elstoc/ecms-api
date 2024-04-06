import { EndpointValidationError } from '../errors';
import { EndpointData, IEndpointValidator } from '../utils/site';
import { RequestHandler } from './RequestHandler.types';

export const createValidateRequestMiddleware = (endpointValidator: IEndpointValidator): RequestHandler => (req, res, next) => {
    const endpointData: EndpointData = {
        requestBody: req.body,
        pathParams: req.params,
        queryParams: req.query
    };
    const errors = endpointValidator.validateEndpoint(`${req.method.toLowerCase()}:${req.path}`, endpointData);
    if (errors.length > 0) {
        console.log(JSON.stringify(errors));
        throw new EndpointValidationError('some stuff went bad', errors);
    }
    next?.();
};
