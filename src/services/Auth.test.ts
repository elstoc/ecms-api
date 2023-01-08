/* eslint-disable  @typescript-eslint/no-explicit-any */
import { Auth } from './Auth';
import * as hash from '../utils/hash';
import * as jwt from '../utils/jwt';

const config = {
    adminDir: '/path/to/admin',
    jwtIssuer: 'issue',
    jwtAudience: 'ui',
    jwtRefreshExpires: '3d',
    jwtAccessExpires: '10m',
    jwtRefreshSecret: 'refreshSecret',
    jwtAccessSecret: 'accessSecret',
} as any;

describe('After creating an Auth object', () => {
    const user = 'thefirstuser';
    const userFullName = 'The first user';
    const userRoles = ['admin'];
    const userPassword = 'This-is-my-password';
    let auth: Auth;
    
    beforeEach(() => {
        auth = new Auth(config);
    });

    describe('running createUser', () => {
        it('does not throw an error for a new user', () => {
            expect(() => auth.createUser(user, userFullName, userRoles)).not.toThrow();
        });

        it('throws an error if a user already exists', () => {
            auth.createUser(user, userFullName, userRoles);
            expect(() => auth.createUser(user, 'again')).toThrow('user already exists');
        });
    });

    describe('running setPassword', () => {
        it('throws error for a non-existent user', async () => {
            await expect(auth.setPassword(user, userPassword)).rejects.toThrow('user does not exist');
        });

        it('runs successfully (attempts to hash password) for an existing user with no password stored and no old password given', async () => {
            auth.createUser(user, userFullName, userRoles);
            const spiedHashPassword = jest.spyOn(hash, 'hashPassword');

            await expect(auth.setPassword(user, userPassword)).resolves.toBeUndefined();

            const passwordBeingHashed = spiedHashPassword.mock.calls[0][0];
            expect(passwordBeingHashed).toBe(userPassword);

            spiedHashPassword.mockRestore();
        });

        it('throws error for an existing user with a previous password stored and no old password given', async () => {
            const newPassword = 'This-is-my-new-password';
            auth.createUser(user, userFullName, userRoles);
            await auth.setPassword(user, userPassword);
            await expect(auth.setPassword(user, newPassword)).rejects.toThrow('old password not entered');
        });

        it('throws error for an existing user with a previous password stored and incorrect old password given', async () => {
            const newPassword = 'This-is-my-new-password';
            auth.createUser(user, userFullName, userRoles);
            await auth.setPassword(user, userPassword);
            await expect(auth.setPassword(user, newPassword, newPassword))
                .rejects.toThrow('passwords do not match');
        });

        it('runs successfully for an existing user with a previous password stored and correct old password given', async () => {
            const newPassword = 'This-is-my-new-password';
            auth.createUser(user, userFullName, userRoles);
            await auth.setPassword(user, userPassword);
            await expect(auth.setPassword(user, newPassword, userPassword))
                .resolves.toBeUndefined();
        });

        it('verifies hashed password by calling verifyPasswordWithHash using appropriate params, then creates new hash', async () => {
            const newPassword = 'This-is-my-new-password';
            auth.createUser(user, userFullName, userRoles);
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

            auth.createUser(user, userFullName, userRoles);
            await auth.setPassword(user, userPassword);
            await expect(auth.getTokensFromPassword(user, notPassword))
                .rejects.toThrow('incorrect password');
        });

        it('returns a pair of jwt tokens (generated with correct params) when called with correct password', async () => {
            const spiedJwtSign = jest.spyOn(jwt, 'sign');
            const expectedTokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };

            spiedJwtSign.mockResolvedValueOnce('access-token')
                .mockResolvedValueOnce('refresh-token');

            auth.createUser(user, userFullName, userRoles);
            await auth.setPassword(user, userPassword);

            await expect(auth.getTokensFromPassword(user, userPassword))
                .resolves.toStrictEqual(expectedTokens);

            spiedJwtSign.mockRestore();
        });

        it('generates jwt tokens using the appropriate parameters', async () => {
            const spiedJwtSign = jest.spyOn(jwt, 'sign');

            auth.createUser(user, userFullName, userRoles);
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

            auth.createUser(user, userFullName, userRoles);
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
            auth.createUser(user, userFullName, userRoles);
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
            auth.createUser(user, userFullName, userRoles);
            await auth.setPassword(user, userPassword);
            const { accessToken } = await auth.getTokensFromPassword(user, userPassword);
            const expectedAccessPayload = { id: user, fullName: userFullName, roles: userRoles };

            const accessPayload = await auth.getUserInfoFromAccessToken(accessToken as string);

            expect(accessPayload).toStrictEqual(expectedAccessPayload);
        });
    });
});
