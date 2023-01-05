/* eslint-disable  @typescript-eslint/no-explicit-any */

import * as jwt from './jwt';

describe('That jwt', () => {
    it('signs and verifies a token signed with the appropriate secret', async () => {
        const inputData = { test: 'data' };
        const secret = 'This is a secret';
        const token = await jwt.sign(inputData, secret, '5s');
        const decodedToken = await jwt.verify(token || '', secret);
        expect(decodedToken).toMatchObject(inputData);
    });

    it('fails to verify a token signed with an incorrect secret', async () => {
        const inputData = { test: 'data' };
        const secret = 'This is a secret';
        const notSecret = 'This is not a secret';
        const token = await jwt.sign(inputData, secret, '5s');
        await expect(jwt.verify(token || '', notSecret)).rejects.toThrow('invalid signature');
    });

    it('fails to verify a token that has expired', async () => {
        const inputData = { test: 'data' };
        const secret = 'This is a secret';
        const token = await jwt.sign(inputData, secret, '-1ms');
        await expect(jwt.verify(token || '', secret)).rejects.toThrow('jwt expired');
    });
});
