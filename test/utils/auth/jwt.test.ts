/* eslint-disable  @typescript-eslint/no-explicit-any */

import * as jwt from '../../../src/utils';

describe('That jwt', () => {
    it('signs and verifies a token signed with the appropriate secret', async () => {
        const inputData = { test: 'data' };
        const secret = 'This is a secret';
        const token = await jwt.jwtSign(inputData, secret, '5s');
        const decodedToken = await jwt.jwtVerify(token || '', secret);
        expect(decodedToken).toMatchObject(inputData);
    });

    it('fails to verify a token signed with an incorrect secret', async () => {
        const inputData = { test: 'data' };
        const secret = 'This is a secret';
        const notSecret = 'This is not a secret';
        const token = await jwt.jwtSign(inputData, secret, '5s');
        await expect(jwt.jwtVerify(token || '', notSecret)).rejects.toThrow('invalid signature');
    });

    it('fails to verify a token that has expired', async () => {
        const inputData = { test: 'data' };
        const secret = 'This is a secret';
        const token = await jwt.jwtSign(inputData, secret, '-1ms');
        await expect(jwt.jwtVerify(token || '', secret)).rejects.toThrow('jwt expired');
    });
});
