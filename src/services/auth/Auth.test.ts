/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unused-vars */
import { AuthenticationError } from '../../errors';
import { Auth } from '..';
import { hashPassword, verifyPasswordWithHash } from './utils/hashUtils';
import { jwtSign, jwtVerify, jwtDecode } from './utils/jwtUtils';

jest.mock('./utils/hashUtils');
jest.mock('./utils/jwtUtils');

const mockHashPassword = hashPassword as jest.Mock;
const mockVerifyPasswordWithHash = verifyPasswordWithHash as jest.Mock;
const mockJwtSign = jwtSign as jest.Mock;
const mockJwtVerify = jwtVerify as jest.Mock;
const mockJwtDecode = jwtDecode as jest.Mock;
const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
} as any;

const config = {
    dataDir: '/path/to/data',
    jwtIssuer: 'issue',
    jwtAudience: 'ui',
    jwtRefreshExpires: '3d',
    jwtAccessExpires: '10m',
    jwtRefreshSecret: 'refreshSecret',
    jwtAccessSecret: 'accessSecret',
    enableAuthentication: true
} as any;

const mockStorage = {
    getAdminFile: jest.fn() as jest.Mock,
    storeAdminFile: jest.fn() as jest.Mock,
    getAdminFileModifiedTime: jest.fn() as jest.Mock,
} as any;

describe('Auth', () => {
    let auth: Auth;
    const emptyUsersFileBuf = Buffer.from('{}');
    
    beforeEach(async () => {
        auth = new Auth(config, mockStorage, mockLogger);
        mockJwtDecode.mockReturnValue({ exp: 123 });
        mockHashPassword.mockImplementation(async (password) => `${password}-hashed`);
        mockVerifyPasswordWithHash.mockImplementation(async (password, hashedPassword) => `${password}-hashed` === hashedPassword);
    });

    describe('constructor', () => {
        describe('with authentication enabled', () => {
            it('throws an error if jwtAccessExpires is undefined', () => {
                const newConfig = { ...config, jwtAccessExpires: undefined };
                expect(() => new Auth(newConfig, mockStorage, mockLogger)).toThrow('All jwt configuration must be defined');
            });

            it('throws an error if jwtRefreshExpires is undefined', () => {
                const newConfig = { ...config, jwtRefreshExpires: undefined };
                expect(() => new Auth(newConfig, mockStorage, mockLogger)).toThrow('All jwt configuration must be defined');
            });

            it('throws an error if jwtAccessSecret is undefined', () => {
                const newConfig = { ...config, jwtAccessSecret: undefined };
                expect(() => new Auth(newConfig, mockStorage, mockLogger)).toThrow('All jwt configuration must be defined');
            });

            it('throws an error if jwtRefreshSecret is undefined', () => {
                const newConfig = { ...config, jwtRefreshSecret: undefined };
                expect(() => new Auth(newConfig, mockStorage, mockLogger)).toThrow('All jwt configuration must be defined');
            });
        });

        describe('with authentication disabled', () => {
            it('does not throw an error if all jwt config is undefined', () => {
                const newConfig = {
                    ...config,
                    enableAuthentication: false,
                    jwtAccessExpires: undefined,
                    jwtRefreshExpires: undefined,
                    jwtAccessSecret: undefined,
                    jwtRefreshSecret: undefined,
                };
                expect(() => new Auth(newConfig, mockStorage, mockLogger)).not.toThrow();
            });
        });
    });

    describe('createUser', () => {

        beforeEach(() => {
            mockStorage.getAdminFileModifiedTime.mockReturnValue(1234);
            mockStorage.getAdminFile.mockResolvedValue(emptyUsersFileBuf);
        });

        it('loads the users file the first time it is run', async () => {
            await auth.createUser('chris');

            expect(mockStorage.getAdminFileModifiedTime).toHaveBeenCalledWith('users.json');
            expect(mockStorage.getAdminFile).toHaveBeenCalledTimes(1);
            expect(mockStorage.getAdminFile).toHaveBeenCalledWith('users.json');
        });

        it('does not load the users file if is run again without the file changing (e.g. if it errored the first time)', async () => {
            await auth.createUser('chris');
            await auth.createUser('john');

            expect(mockStorage.getAdminFile).toHaveBeenCalledTimes(1);
        });

        it('reloads the users file if is changed externally', async () => {
            mockStorage.getAdminFileModifiedTime
                .mockClear()
                .mockReturnValueOnce(1234) //check whether to read users.json
                .mockReturnValueOnce(2345) //written users.json
                .mockReturnValueOnce(3456) //check whether to read users.json
                .mockReturnValue(4567);    //written users.json

            await auth.createUser('chris');
            await auth.createUser('john');

            expect(mockStorage.getAdminFile).toHaveBeenCalledTimes(2);
        });

        it('throws an error if added user already exists; doesn\'t attempt to write users.json', async () => {
            mockStorage.getAdminFile
                .mockClear()
                .mockResolvedValue(Buffer.from('{ "chris": {} }'));

            await expect(auth.createUser('chris')).rejects.toThrow(new AuthenticationError('user already exists'));
            expect(mockStorage.storeAdminFile).not.toHaveBeenCalled();
        });

        it('writes newly created user to users.json', async () => {
            await auth.createUser('chris');

            const expectedFileContent = JSON.stringify({ chris: { id: 'chris' } }, null, 4);
            expect(mockStorage.storeAdminFile).toHaveBeenCalledWith('users.json', Buffer.from(expectedFileContent, 'utf-8'));
        });
    });

    describe('setPassword', () => {

        beforeEach(() => {
            mockStorage.getAdminFileModifiedTime.mockReturnValue(1234);
            mockStorage.getAdminFile.mockResolvedValue(Buffer.from('{ "chris": {} }'));
        });

        it('loads the users file the first time it is run', async () => {
            await auth.setPassword('chris', 'Blob');

            expect(mockStorage.getAdminFileModifiedTime).toHaveBeenCalledWith('users.json');
            expect(mockStorage.getAdminFile).toHaveBeenCalledTimes(1);
            expect(mockStorage.getAdminFile).toHaveBeenCalledWith('users.json');
        });

        it('does not load the users file if is run again without the file changing (e.g. if it errored the first time)', async () => {
            await auth.setPassword('chris', 'Blob');
            await auth.setPassword('chris', 'Blib', 'Blob');

            expect(mockStorage.getAdminFile).toHaveBeenCalledTimes(1);
        });

        it('reloads the users file if is changed externally', async () => {
            mockStorage.getAdminFileModifiedTime
                .mockClear()
                .mockReturnValueOnce(1234) //check whether to read users.json
                .mockReturnValueOnce(2345) //written users.json
                .mockReturnValueOnce(3456) //check whether to read users.json
                .mockReturnValue(4567);    //written users.json

            await auth.setPassword('chris', 'Blob');
            await auth.setPassword('chris', 'Blib', 'Blob');

            expect(mockStorage.getAdminFile).toHaveBeenCalledTimes(2);
        });

        it('throws error for a non-existent user', async () => {
            await expect(auth.setPassword('john', 'Blob')).rejects.toThrow(new AuthenticationError('user does not exist'));
        });

        it('runs successfully (attempts to hash password) for an existing user with no password stored and no old password given', async () => {
            await expect(auth.setPassword('chris', 'some-password')).resolves.toBeUndefined();

            const passwordBeingHashed = mockHashPassword.mock.calls[0][0];
            expect(passwordBeingHashed).toBe('some-password');
        });

        it('writes the users file when the password is successfully changed', async () => {
            await auth.setPassword('chris', 'some-password');
            const writeFilePath = mockStorage.storeAdminFile.mock.calls[0][0];
            expect(writeFilePath).toBe('users.json');
        });

        it('throws error for an existing user with a previous password stored and no old password given', async () => {
            await auth.setPassword('chris', 'some-password');
            await expect(auth.setPassword('chris', 'some-new-password')).rejects.toThrow(new AuthenticationError('old password not entered'));
        });

        it('throws error for an existing user with a previous password stored and incorrect old password given', async () => {
            await auth.setPassword('chris', 'some-password');
            await expect(auth.setPassword('chris', 'some-new-password', 'some-wrong-password'))
                .rejects.toThrow(new AuthenticationError('passwords do not match'));
        });

        it('runs successfully for an existing user with a previous password stored and correct old password given', async () => {
            await auth.setPassword('chris', 'some-password');
            expect(auth.setPassword('chris', 'some-new-password', 'some-password')).resolves.toBeUndefined();
        });

        it('verifies hashed password by calling verifyPasswordWithHash using appropriate params, then creates new hash', async () => {
            await auth.setPassword('chris', 'some-password');
            await auth.setPassword('chris', 'some-new-password', 'some-password');

            expect(mockVerifyPasswordWithHash).toHaveBeenCalledWith('some-password', 'some-password-hashed');
            expect(mockHashPassword).toHaveBeenLastCalledWith('some-new-password');
        });
    });

    describe('getTokensFromPassword', () => {
        const initialUserFileContent = {
            chris: {
                id: 'chris',
                roles: 'chris-has-roles',
                fullName: 'Chris Has A Name',
                hashedPassword: 'some-password-hashed'
            }
        };

        beforeEach( async () => {
            mockStorage.getAdminFileModifiedTime.mockReturnValue(1234);
            mockStorage.getAdminFile.mockResolvedValue(Buffer.from(JSON.stringify(initialUserFileContent)));
        });

        it('loads the users file the first time it is run', async () => {
            await auth.getTokensFromPassword('chris', 'some-password');

            expect(mockStorage.getAdminFileModifiedTime).toHaveBeenCalledWith('users.json');
            expect(mockStorage.getAdminFile).toHaveBeenCalledTimes(1);
            expect(mockStorage.getAdminFile).toHaveBeenCalledWith('users.json');
        });

        it('does not load the users file if is run again without the file changing (e.g. if it errored the first time)', async () => {
            await auth.getTokensFromPassword('chris', 'some-password');

            expect(mockStorage.getAdminFile).toHaveBeenCalledTimes(1);
        });

        it('reloads the users file if is changed externally', async () => {
            mockStorage.getAdminFileModifiedTime
                .mockClear()
                .mockReturnValueOnce(1234) //check whether to read users.json
                .mockReturnValueOnce(2345) //written users.json
                .mockReturnValueOnce(3456) //check whether to read users.json
                .mockReturnValue(4567);    //written users.json

            await auth.getTokensFromPassword('chris', 'some-password');
            await auth.getTokensFromPassword('chris', 'some-password');

            expect(mockStorage.getAdminFile).toHaveBeenCalledTimes(2);
        });

        it('throws error for a non-existent user', async () => {
            await expect(auth.getTokensFromPassword('john', 'Blob')).rejects.toThrow(new AuthenticationError('user does not exist'));
        });

        it('throws error when called with incorrect password', async () => {
            await expect(auth.getTokensFromPassword('chris', 'a-different-password'))
                .rejects.toThrow(new AuthenticationError('incorrect password'));
        });

        it('returns a pair of jwt tokens (generated with correct params) when called with correct password', async () => {
            mockJwtSign.mockResolvedValueOnce('access-token')
                .mockResolvedValueOnce('refresh-token');

            const actualTokens = await auth.getTokensFromPassword('chris', 'some-password');
            
            const expectedTokens = { id: 'chris', accessToken: 'access-token', accessTokenExpiry: 123, refreshToken: 'refresh-token' };
            const { id, fullName, roles } = initialUserFileContent.chris;
            const accessPayload = {
                id,
                fullName,
                roles
            };
            expect(verifyPasswordWithHash).toHaveBeenCalled();
            expect(hashPassword).not.toHaveBeenCalled();
            expect(actualTokens).toStrictEqual(expectedTokens);
            expect(mockJwtSign).toHaveBeenCalledWith(accessPayload, config.jwtAccessSecret, config.jwtAccessExpires);
            expect(mockJwtSign).toHaveBeenCalledWith({ id }, config.jwtRefreshSecret, config.jwtRefreshExpires);
        });

        it('sets the password and returns jwt tokens if user does not yet have a hashed password stored', async () => {
            const userFileContent = {
                chris: {
                    id: 'chris',
                    roles: 'chris-has-roles',
                    fullName: 'Chris Has A Name',
                }
            };

            mockStorage.getAdminFileModifiedTime.mockReturnValue(2345);
            mockStorage.getAdminFile.mockResolvedValue(Buffer.from(JSON.stringify(userFileContent)));
            mockJwtSign.mockResolvedValueOnce('access-token')
                .mockResolvedValueOnce('refresh-token');

            const actualTokens = await auth.getTokensFromPassword('chris', 'some-other-password');
            
            const expectedTokens = { id: 'chris', accessToken: 'access-token', accessTokenExpiry: 123, refreshToken: 'refresh-token' };
            const { id, fullName, roles } = initialUserFileContent.chris;
            const accessPayload = {
                id,
                fullName,
                roles
            };
            expect(verifyPasswordWithHash).not.toHaveBeenCalled();
            expect(hashPassword).toHaveBeenCalledWith('some-other-password');
            expect(actualTokens).toStrictEqual(expectedTokens);
            expect(mockJwtSign).toHaveBeenCalledWith(accessPayload, config.jwtAccessSecret, config.jwtAccessExpires);
            expect(mockJwtSign).toHaveBeenCalledWith({ id }, config.jwtRefreshSecret, config.jwtRefreshExpires);
        });
    });

    describe('getTokensFromRefreshToken', () => {
        const initialUserFileContent = {
            chris: {
                id: 'chris',
                roles: 'chris-has-roles',
                fullName: 'Chris Has A Name',
                hashedPassword: 'some-password-hashed'
            }
        };

        beforeEach( async () => {
            mockStorage.getAdminFileModifiedTime.mockReturnValue(1234);
            mockStorage.getAdminFile.mockResolvedValue(Buffer.from(JSON.stringify(initialUserFileContent)));
            mockJwtVerify.mockImplementation(async (payload) => JSON.parse(payload));
        });

        it('loads the users file the first time it is run', async () => {
            await auth.getTokensFromRefreshToken('{ "id": "chris" }');

            expect(mockStorage.getAdminFileModifiedTime).toHaveBeenCalledWith('users.json');
            expect(mockStorage.getAdminFile).toHaveBeenCalledTimes(1);
            expect(mockStorage.getAdminFile).toHaveBeenCalledWith('users.json');
        });

        it('does not load the users file if is run again without the file changing (e.g. if it errored the first time)', async () => {
            await auth.getTokensFromRefreshToken('{ "id": "chris" }');

            expect(mockStorage.getAdminFile).toHaveBeenCalledTimes(1);
        });

        it('reloads the users file if is changed externally', async () => {
            mockStorage.getAdminFileModifiedTime
                .mockClear()
                .mockReturnValueOnce(1234) //check whether to read users.json
                .mockReturnValueOnce(2345) //written users.json
                .mockReturnValueOnce(3456) //check whether to read users.json
                .mockReturnValue(4567);    //written users.json

            await auth.getTokensFromRefreshToken('{ "id": "chris" }');
            await auth.getTokensFromRefreshToken('{ "id": "chris" }');

            expect(mockStorage.getAdminFile).toHaveBeenCalledTimes(2);
        });

        it('throws an error if jwtVerify throws (e.g. expired/incorrectly-signed token)', async () => {
            mockJwtVerify.mockRejectedValue(new AuthenticationError('jwt expired'));
            await expect(auth.getTokensFromRefreshToken('{ "id": "chris" }'))
                .rejects.toThrow(new AuthenticationError('jwt expired'));
        });

        it('throws error when called for a token that does not contain an id', async () => {
            await expect(auth.getTokensFromRefreshToken('{ "not-an-id": "chris" }'))
                .rejects.toThrow(new AuthenticationError('id not stored in payload'));
        });

        it('throws error when called for non-existent user', async () => {
            await expect(auth.getTokensFromRefreshToken('{ "id": "not-chris" }'))
                .rejects.toThrow(new AuthenticationError('user does not exist'));
        });

        it('returns a pair of jwt tokens (generated with correct params) when called with correct refresh token', async () => {
            const expectedTokens = { id: 'chris', accessToken: 'access-token', accessTokenExpiry: 123, refreshToken: 'refresh-token' };
            mockJwtSign.mockResolvedValueOnce('access-token')
                .mockResolvedValueOnce('refresh-token');

            const actualTokens = await auth.getTokensFromRefreshToken('{ "id": "chris" }');

            const { id, fullName, roles } = initialUserFileContent.chris;
            const accessPayload = {
                id,
                fullName,
                roles
            };
            expect(actualTokens).toStrictEqual(expectedTokens);
            expect(mockJwtSign).toHaveBeenCalledWith(accessPayload, config.jwtAccessSecret, config.jwtAccessExpires);
            expect(mockJwtSign).toHaveBeenCalledWith({ id }, config.jwtRefreshSecret, config.jwtRefreshExpires);
        });
    });

    describe('getUserInfoFromAuthHeader', () => {
        const initialUserFileContent = {
            chris: {
                id: 'chris',
                roles: 'chris-has-roles',
                fullName: 'Chris Has A Name',
                hashedPassword: 'some-password-hashed'
            }
        };

        beforeEach(() => {
            mockJwtVerify.mockImplementation(async (payload) => JSON.parse(payload));
        });

        afterEach(() => {
            jest.resetAllMocks();
        });

        it('throws an error if jwtVerify throws (e.g. expired/incorrectly-signed token)', async () => {
            mockJwtVerify.mockRejectedValue(new AuthenticationError('jwt expired'));
            await expect(auth.getUserInfoFromAuthHeader('Bearer some-bearer-token'))
                .rejects.toThrow(new AuthenticationError('jwt expired'));
        });

        it('returns appropriate user data when called using a token generated by getTokensFromPassword', async () => {
            const { id, fullName, roles } = initialUserFileContent.chris;
            const expectedAccessPayload = { id, fullName, roles };

            const actualAccessPayload = await auth.getUserInfoFromAuthHeader(`Bearer ${JSON.stringify(expectedAccessPayload)}`);

            expect(actualAccessPayload).toStrictEqual(expectedAccessPayload);
        });

        it('returns guest user data when called without a bearer token', async () => {
            const expectedAccessPayload = { id: 'guest', fullName: 'Guest', roles: [] };

            const accessPayload = await auth.getUserInfoFromAuthHeader(undefined);

            expect(accessPayload).toStrictEqual(expectedAccessPayload);
        });

        it('returns guest user data when called with a string that does not start with "Bearer"', async () => {
            const expectedAccessPayload = { id: 'guest', fullName: 'Guest', roles: [] };

            const accessPayload = await auth.getUserInfoFromAuthHeader('some string');

            expect(accessPayload).toStrictEqual(expectedAccessPayload);
        });

        it('returns guest user data when called with an incorrect bearer token but authentication is disabled', async () => {
            const newConfig = { ...config, enableAuthentication: false };
            auth = new Auth(newConfig, mockStorage, mockLogger);
            mockJwtVerify.mockRejectedValue(new AuthenticationError('jwt expired'));

            const accessPayload = await auth.getUserInfoFromAuthHeader('Bearer some-bearer-token');

            const expectedAccessPayload = { id: 'guest', fullName: 'Guest', roles: [] };
            expect(accessPayload).toStrictEqual(expectedAccessPayload);
        });
    });
});
