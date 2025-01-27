export class AuthenticationError extends Error { }

export class NotFoundError extends Error { }

export class NotPermittedError extends Error { }

export class OASParsingError extends Error { }

export type ValidationErrorDetail = {
    property: string;
    error: string;
}

export class EndpointValidationError extends Error {
    constructor(message: string, public validationErrors: ValidationErrorDetail[]) {
        super(message);
    }
}
