import { ValidationError } from './api';

export class AuthenticationError extends Error { }

export class NotFoundError extends Error { }

export class NotPermittedError extends Error { }

export class OASParsingError extends Error { }

export class EndpointValidationError extends Error {
    constructor(message: string, public validationErrors: ValidationError[]) {
        super(message);
    }
}
