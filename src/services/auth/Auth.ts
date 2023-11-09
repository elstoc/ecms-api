import { Config, jwtSign, jwtVerify, jwtDecode, hashPassword, verifyPasswordWithHash } from '../../utils';
import { User, Token, Tokens, IAuth } from './IAuth';
import { JwtPayload } from 'jsonwebtoken';
import { IStorageAdapter } from '../../adapters/IStorageAdapter';

export class Auth implements IAuth {
    private jwtRefreshExpires = '';
    private jwtAccessExpires = '';
    private jwtRefreshSecret = '';
    private jwtAccessSecret = '';
    private usersfromFileTime = -1;
    private users: { [key: string]: User } = {};
    private usersFile = 'users.json';

    public constructor(
        private config: Config,
        private storage: IStorageAdapter
    ) {
        if (!this.config.enableAuthentication)
            return;
        
        if (!config.jwtAccessExpires || !config.jwtRefreshExpires || !config.jwtAccessSecret || !config.jwtRefreshSecret) {
            throw new Error('All jwt configuration must be defined');
        }

        this.jwtAccessExpires = config.jwtAccessExpires;
        this.jwtRefreshExpires = config.jwtRefreshExpires;
        this.jwtAccessSecret = config.jwtAccessSecret;
        this.jwtRefreshSecret = config.jwtRefreshSecret;
    }

    public async createUser(id: string, fullName?: string, roles?: string[]): Promise<void> {
        await this.readUsersFromFile();
        if (this.users[id]) {
            throw new Error('user already exists');
        }
        this.users[id] = { id, fullName, roles };
        await this.writeUsersToFile();
    }

    private async readUsersFromFile(): Promise<void> {
        const usersFileModifiedTime = this.storage.getAdminFileModifiedTime(this.usersFile);
        if (this.usersfromFileTime === usersFileModifiedTime) {
            return;
        }
        const usersFileBuf = await this.storage.getAdminFile(this.usersFile);
        this.users = JSON.parse(usersFileBuf.toString('utf-8'));
        this.usersfromFileTime = usersFileModifiedTime;
    }

    private async writeUsersToFile(): Promise<void> {
        const usersJson = JSON.stringify(this.users, null, 4);
        await this.storage.storeAdminFile(this.usersFile, Buffer.from(usersJson));
        this.usersfromFileTime = this.storage.getAdminFileModifiedTime(this.usersFile);
    }

    public async setPassword(id: string, newPassword: string, oldPassword?: string): Promise<void> {
        await this.readUsersFromFile();
        this.throwIfNoUser(id);
        if (this.users[id].hashedPassword) {
            if (!oldPassword) {
                throw new Error('old password not entered');
            }
            if (!(await this.verifyPassword(id, oldPassword))) {
                throw new Error('passwords do not match');
            }
        }
        const hashed = await hashPassword(newPassword);
        this.users[id].hashedPassword = hashed;
        await this.writeUsersToFile();
    }

    private throwIfNoUser(id: string): void {
        if (!this.users[id]) {
            throw new Error('user does not exist');
        }
    }

    private async verifyPassword(id: string, password: string): Promise<boolean> {
        this.throwIfNoUser(id);
        const hashedPassword = this.users[id]?.hashedPassword;
        if (!hashedPassword) {
            this.setPassword(id, password);
            return true;
        }
        return await verifyPasswordWithHash(password, hashedPassword);
    }

    public async getTokensFromPassword(id: string, password: string): Promise<Tokens> {
        await this.readUsersFromFile();
        this.throwIfNoUser(id);
        if (!(await this.verifyPassword(id, password))) {
            throw new Error('incorrect password');
        }
        return await this.getTokensFromId(id);
    }

    public async getTokensFromRefreshToken(refreshToken: string): Promise<Tokens> {
        await this.readUsersFromFile();
        const id = await this.verifyRefreshTokenAndGetId(refreshToken);
        return await this.getTokensFromId(id);
    }

    private async verifyRefreshTokenAndGetId(token: string): Promise<string> {
        const payload = await jwtVerify(token, this.jwtRefreshSecret);
        const { id } = payload as User;
        if (!id) {
            throw new Error('id not stored in payload');
        }
        this.throwIfNoUser(id);
        return id;
    } 

    private async getTokensFromId(id: string): Promise<Tokens> {
        const accessToken = await this.getAccessToken(id);
        const refreshToken = await this.getRefreshToken(id);
        const accessTokenExpiry = (jwtDecode(accessToken as string) as JwtPayload).exp ?? 0;
        return { id, accessToken, refreshToken, accessTokenExpiry };
    }

    private async getAccessToken (id: string): Promise<Token> {
        const payload = {
            id: this.users[id].id,
            fullName: this.users[id].fullName,
            roles: this.users[id].roles
        };
        return await jwtSign(payload, this.jwtAccessSecret, this.jwtAccessExpires);
    }

    private async getRefreshToken(id: string): Promise<Token> {
        const payload = { id };
        return await jwtSign(payload, this.jwtRefreshSecret, this.jwtRefreshExpires);
    }

    public async getUserInfoFromAuthHeader(authHeader: string | undefined): Promise<User> {
        let user: User;
        if (this.config.enableAuthentication && authHeader?.startsWith('Bearer ')) {
            const bearerToken = authHeader?.substring(7);
            const payload = await jwtVerify(bearerToken, this.jwtAccessSecret);
            const { id, fullName, roles } = payload as User;
            user = { id, fullName, roles };
        } else {
            user = { id: 'guest', fullName: 'Guest', roles: [] };
        }
        return user;
    }
}
