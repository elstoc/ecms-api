export type User = {
    id: string;
    fullName?: string;
    roles?: string[];
    hashedPassword?: string;
};

export type Token = string | undefined;

export type Tokens = {
    id: string;
    accessToken: Token;
    accessTokenExpiry: number;
    refreshToken: Token;
}

export interface IAuth {
    createUser(id: string, fullName?: string, roles?: string[]): void,
    setPassword(id: string, newPassword: string, oldPassword?: string): Promise<void>,
    getTokensFromPassword(id: string, password: string): Promise<Tokens>,
    getTokensFromRefreshToken(refreshToken: string): Promise<Tokens>,
    getUserInfoFromAuthHeader(authHeader: string | undefined): Promise<User>
}
