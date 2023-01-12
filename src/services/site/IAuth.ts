export type User = {
    id: string;
    fullName?: string;
    roles?: string[];
    hashedPassword?: string;
};

export type Token = string | undefined;

export type Tokens = {
    accessToken: Token;
    refreshToken: Token;
}

export interface IAuth {
    createUser(id: string, fullName?: string, roles?: string[]): void,
    setPassword(id: string, newPassword: string, oldPassword?: string): Promise<void>,
    getTokensFromPassword(id: string, password: string): Promise<Tokens>,
    getTokensFromRefreshToken(refreshToken: string): Promise<Tokens>,
    getUserInfoFromAccessToken(token: string): Promise<User>
}
