import { createCipheriv, createDecipheriv, scryptSync } from 'crypto';
import { Request } from 'express';
import { decode, sign, verify } from 'jsonwebtoken';

export enum TokenType {
    ACCESS_TOKEN = 'access_token',
    REFRESH_TOKEN = 'refresh_token',
}

type Token = {
    token: string;
    expiration: number;
};

type JWT = {
    exp: number;
    type: TokenType;
    sub: string
};

export class Auth {
    private secret: string;
    private key: Buffer;
    private algorithm: string;
    private iv: Buffer;
    private audience: string;
    private issuer: string;
    private tokenExpiresIn: number;
    private refreshExpiresIn: number;

    constructor() {
        this.algorithm = 'aes-192-cbc';
        this.secret = 'the-secret-thing';
        this.key = scryptSync(this.secret, 'salt', 24);
        this.iv = Buffer.alloc(16, 0); // Initialization crypto vector
        this.audience = 'authentication.token.audience';
        this.issuer = 'authentication.token.issuer';
        this.tokenExpiresIn = 1;
        this.refreshExpiresIn = 2;
    }

    public encrypt(text: string): string {
        const cipher = createCipheriv(this.algorithm, this.key, this.iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    public decrypt(text: string): string {
        const decipher = createDecipheriv(this.algorithm, this.key, this.iv);
        let decrypted = decipher.update(text, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    public generateAccessToken(userId: string): Token {
        return this.generateToken(userId, TokenType.ACCESS_TOKEN);
    }

    public generateRefreshToken(userId: string): Token {
        return this.generateToken(userId, TokenType.REFRESH_TOKEN);
    }

    public generateToken(userId: string, type: TokenType): Token {
        const expiresIn =
            type === TokenType.ACCESS_TOKEN
                ? this.tokenExpiresIn
                : this.refreshExpiresIn;

        const token = sign({ type }, this.secret, {
            expiresIn,
            audience: this.audience,
            issuer: this.issuer,
            subject: userId,
        });

        return {
            token: this.encrypt(token),
            expiration: (decode(token) as JWT).exp * 1000,
        };
    }

    public getTokenType(token: string): TokenType {
        return (verify(token, this.secret) as JWT).type;
    }

    public parseTokenAndGetUserId(token: string): string {
        const decryptedToken = this.decrypt(token);
        const decoded = verify(decryptedToken, this.secret) as JWT;
        return decoded.sub || '';
    }

    public jwtFromRequest(req: Request) {
        try {
            if (!req.headers.authorization) {
                throw new Error('token was not provided, authorization header is empty');
            }

            const tokenFromHeader = req.headers.authorization.replace('Bearer ', '').trim();
            const decryptedToken = this.decrypt(tokenFromHeader);
            const tokenType = this.getTokenType(decryptedToken);

            if (tokenType !== TokenType.ACCESS_TOKEN) {
                throw new Error('wrong token type provided');
            }

            return decryptedToken;
        } catch (e) {
            console.error('Token is not valid', e.message);
            return null;
        }
    }
}
