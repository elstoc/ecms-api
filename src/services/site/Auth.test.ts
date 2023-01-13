/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unused-vars */
import fs from 'fs';
import { Auth } from './Auth';
import * as hash from '../../utils/site/hash';
import * as jwt from '../../utils/site/jwt';
import { SitePaths } from './SitePaths';

jest.mock('fs');

const config = {
    adminDir: '/path/to/admin',
    jwtIssuer: 'issue',
    jwtAudience: 'ui',
    jwtRefreshExpires: '3d',
    jwtAccessExpires: '10m',
    jwtRefreshSecret: 'refreshSecret',
    jwtAccessSecret: 'accessSecret',
} as any;

const initialUsers = { 'thefirstuser': { id: 'thefirstuser', fullName: 'The first user', roles: ['admin'] } };

describe('When creating an Auth Object', () => {
    it('Loads users from the users file if it exists', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        const mockReadFileSync = (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(initialUsers, null, 4));
        const sitePaths = new SitePaths(config);
        const auth = new Auth(config, sitePaths);
        expect(mockReadFileSync).toBeCalledTimes(1);
        const readFromLocation = mockReadFileSync.mock.calls[0][0];
        expect(readFromLocation).toBe('/path/to/admin/users.json');
    });

    it('Does not load from the users file if it does not exist', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        const mockReadFileSync = (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(initialUsers, null, 4));
        const sitePaths = new SitePaths(config);
        const auth = new Auth(config, sitePaths);
        expect(mockReadFileSync).not.toBeCalled();
    });
});

describe('After creating an Auth object', () => {
    const user = 'thefirstuser';
    const userFullName = 'The first user';
    const userRoles = ['admin'];
    const userPassword = 'This-is-my-password';
    let auth: Auth;
    let sitePaths: SitePaths;
    let mockWriteFileSync: jest.Mock;
    
    beforeEach(() => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(initialUsers, null, 4));
        mockWriteFileSync = (fs.writeFileSync as jest.Mock);
        sitePaths = new SitePaths(config);
        auth = new Auth(config, sitePaths);
    });

    describe('running createUser', () => {
        it('does not throw an error for a new user', () => {
            expect(() => auth.createUser('anotheruser', userFullName, userRoles)).not.toThrow();
        });

        it('writes users to a file after creation', () => {
            const expectedUsers = { ...initialUsers, anotheruser: { id: 'anotheruser', fullName: 'The first user', roles: ['admin'] } };
            auth.createUser('anotheruser', userFullName, userRoles);
            const writeFileLocation = mockWriteFileSync.mock.calls[0][0];
            const writeFileContent = mockWriteFileSync.mock.calls[0][1];
            expect(writeFileLocation).toBe('/path/to/admin/users.json');
            expect(writeFileContent).toBe(JSON.stringify(expectedUsers, null, 4));
        });

        it('throws an error if a user already exists', () => {
            expect(() => auth.createUser(user, userFullName)).toThrow('user already exists');
        });
    });

    describe('running setPassword', () => {
        it('throws error for a non-existent user', async () => {
            await expect(auth.setPassword('anotheruser', userPassword)).rejects.toThrow('user does not exist');
        });

        it('runs successfully (attempts to hash password) for an existing user with no password stored and no old password given', async () => {
            const spiedHashPassword = jest.spyOn(hash, 'hashPassword');

            await expect(auth.setPassword(user, userPassword)).resolves.toBeUndefined();

            const passwordBeingHashed = spiedHashPassword.mock.calls[0][0];
            expect(passwordBeingHashed).toBe(userPassword);

            spiedHashPassword.mockRestore();
        });

        it('writes the users file when the password is successfully changed', async () => {
            await auth.setPassword(user, userPassword);
            expect(mockWriteFileSync).toBeCalledTimes(1);
            const writeFilePath = mockWriteFileSync.mock.calls[0][0];
            expect(writeFilePath).toBe('/path/to/admin/users.json');
        });

        it('throws error for an existing user with a previous password stored and no old password given', async () => {
            const newPassword = 'This-is-my-new-password';
            await auth.setPassword(user, userPassword);
            await expect(auth.setPassword(user, newPassword)).rejects.toThrow('old password not entered');
        });

        it('throws error for an existing user with a previous password stored and incorrect old password given', async () => {
            const newPassword = 'This-is-my-new-password';
            await auth.setPassword(user, userPassword);
            await expect(auth.setPassword(user, newPassword, newPassword))
                .rejects.toThrow('passwords do not match');
        });

        it('runs successfully for an existing user with a previous password stored and correct old password given', async () => {
            const newPassword = 'This-is-my-new-password';
            await auth.setPassword(user, userPassword);
            await expect(auth.setPassword(user, newPassword, userPassword))
                .resolves.toBeUndefined();
        });

        it('verifies hashed password by calling verifyPasswordWithHash using appropriate params, then creates new hash', async () => {
            const newPassword = 'This-is-my-new-password';
            const spiedHashPassword = jest.spyOn(hash, 'hashPassword').mockResolvedValue('oldHash');
            const spiedVerifyPasswordWithHash = jest.spyOn(hash, 'verifyPasswordWithHash').mockResolvedValue(true);

            await auth.setPassword(user, userPassword);
            await auth.setPassword(user, newPassword, userPassword);

            expect(spiedVerifyPasswordWithHash).toBeCalledWith(userPassword, 'oldHash');
            expect(spiedHashPassword).lastCalledWith(newPassword);

            spiedHashPassword.mockRestore();
            spiedVerifyPasswordWithHash.mockRestore();
        });
    });

    describe('running getTokensFromPassword', () => {
        it('throws error when called for a non-existent user', async () => {
            await expect(auth.getTokensFromPassword('nouser', 'nopassword'))
                .rejects.toThrow('user does not exist');
        });

        it('throws error when called with incorrect password', async () => {
            const notPassword = 'This-is-not-my-password';

            await auth.setPassword(user, userPassword);
            await expect(auth.getTokensFromPassword(user, notPassword))
                .rejects.toThrow('incorrect password');
        });

        it('returns a pair of jwt tokens (generated with correct params) when called with correct password', async () => {
            const spiedJwtSign = jest.spyOn(jwt, 'sign');
            const expectedTokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };

            spiedJwtSign.mockResolvedValueOnce('access-token')
                .mockResolvedValueOnce('refresh-token');

            await auth.setPassword(user, userPassword);

            await expect(auth.getTokensFromPassword(user, userPassword))
                .resolves.toStrictEqual(expectedTokens);

            spiedJwtSign.mockRestore();
        });

        it('generates jwt tokens using the appropriate parameters', async () => {
            const spiedJwtSign = jest.spyOn(jwt, 'sign');

            await auth.setPassword(user, userPassword);
            await auth.getTokensFromPassword(user, userPassword);

            const [accessJwtCallPayload, accessJwtCallSecret, accessJwtCallExpires] = spiedJwtSign.mock.calls[0];
            const [refreshJwtCallPayload, refreshJwtCallSecret, refreshJwtCallExpires] = spiedJwtSign.mock.calls[1];

            const expectedAccessPayload = { id: user, fullName: userFullName, roles: userRoles };
            const expectedRefreshPayload = { id: user };

            expect(accessJwtCallPayload).toStrictEqual(expectedAccessPayload);
            expect(accessJwtCallSecret).toBe(config.jwtAccessSecret);
            expect(accessJwtCallExpires).toBe(config.jwtAccessExpires);
            expect(refreshJwtCallPayload).toStrictEqual(expectedRefreshPayload);
            expect(refreshJwtCallSecret).toBe(config.jwtRefreshSecret);
            expect(refreshJwtCallExpires).toBe(config.jwtRefreshExpires);

            spiedJwtSign.mockRestore();
        });
    });

    describe('running getTokensFromRefreshToken', () => {
        it('throws error when called with an expired token', async () => {
            const payload = { id: 'notanid' };
            const refreshToken = await jwt.sign(payload, config.jwtRefreshSecret, '-1s');
            await expect(auth.getTokensFromRefreshToken(refreshToken as string))
                .rejects.toThrow('jwt expired');
        });

        it('throws error when called with an incorrectly signed token', async () => {
            const payload = { id: 'notanid' };
            const refreshToken = await jwt.sign(payload, 'not-a-secret', config.jwtRefreshExpires);
            await expect(auth.getTokensFromRefreshToken(refreshToken as string))
                .rejects.toThrow('invalid signature');
        });

        it('throws error when called for a token that does not contain an id', async () => {
            const payload = { notId: 'notanid' };
            const refreshToken = await jwt.sign(payload, config.jwtRefreshSecret, config.jwtRefreshExpires);
            await expect(auth.getTokensFromRefreshToken(refreshToken as string)).
                rejects.toThrow('id not stored in payload');
        });

        it('throws error when called for a token containing a non-existent id', async () => {
            const payload = { id: 'notanid' };
            const refreshToken = await jwt.sign(payload, config.jwtRefreshSecret, config.jwtRefreshExpires);
            await expect(auth.getTokensFromRefreshToken(refreshToken as string))
                .rejects.toThrow('user does not exist');
        });

        it('returns a pair of jwt tokens (generated with correct params) when called with correct refresh token', async () => {
            const expectedTokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };

            await auth.setPassword(user, userPassword);

            const { refreshToken } = await auth.getTokensFromPassword(user, userPassword);

            const spiedJwtSign = jest.spyOn(jwt, 'sign');
            spiedJwtSign.mockResolvedValueOnce('access-token')
                .mockResolvedValueOnce('refresh-token');

            const returnedTokens = await auth.getTokensFromRefreshToken(refreshToken as string);
            expect(returnedTokens).toStrictEqual(expectedTokens);

            spiedJwtSign.mockRestore();
        });

        it('generates jwt tokens using the appropriate parameters', async () => {
            await auth.setPassword(user, userPassword);
            const { refreshToken } = await auth.getTokensFromPassword(user, userPassword);

            const spiedJwtSign = jest.spyOn(jwt, 'sign');
            await auth.getTokensFromRefreshToken(refreshToken as string);

            const [accessJwtCallPayload, accessJwtCallSecret, accessJwtCallExpires] = spiedJwtSign.mock.calls[0];
            const [refreshJwtCallPayload, refreshJwtCallSecret, refreshJwtCallExpires] = spiedJwtSign.mock.calls[1];

            const expectedAccessPayload = { id: user, fullName: userFullName, roles: userRoles };
            const expectedRefreshPayload = { id: user };

            expect(accessJwtCallPayload).toStrictEqual(expectedAccessPayload);
            expect(accessJwtCallSecret).toBe(config.jwtAccessSecret);
            expect(accessJwtCallExpires).toBe(config.jwtAccessExpires);
            expect(refreshJwtCallPayload).toStrictEqual(expectedRefreshPayload);
            expect(refreshJwtCallSecret).toBe(config.jwtRefreshSecret);
            expect(refreshJwtCallExpires).toBe(config.jwtRefreshExpires);

            spiedJwtSign.mockRestore();
        });
    });

    describe('running getUserInfoFromAccessToken', () => {
        it('throws error when called with an expired token', async () => {
            const payload = { id: 'notanid' };
            const accessToken = await jwt.sign(payload, config.jwtAccessSecret, '-1s');
            await expect(auth.getUserInfoFromAccessToken(accessToken as string))
                .rejects.toThrow('jwt expired');
        });

        it('throws error when called with an incorrectly signed token', async () => {
            const payload = { id: 'notanid' };
            const accessToken = await jwt.sign(payload, 'not-a-secret', config.jwtAccessExpires);
            await expect(auth.getUserInfoFromAccessToken(accessToken as string))
                .rejects.toThrow('invalid signature');
        });

        it('returns appropriate user data when called using a token generated by getTokensFromPassword', async () => {
            await auth.setPassword(user, userPassword);
            const { accessToken } = await auth.getTokensFromPassword(user, userPassword);
            const expectedAccessPayload = { id: user, fullName: userFullName, roles: userRoles };

            const accessPayload = await auth.getUserInfoFromAccessToken(accessToken as string);

            expect(accessPayload).toStrictEqual(expectedAccessPayload);
        });
    });
});
