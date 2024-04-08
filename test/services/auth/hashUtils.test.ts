/* eslint-disable  @typescript-eslint/no-explicit-any */

import { hashPassword, verifyPasswordWithHash } from '../../../src/services/auth/hashUtils';

describe('That hash', () => {
    it('verifies a valid password', async () => {
        const hash = await hashPassword('ThisPassword');
        const verified = await verifyPasswordWithHash('ThisPassword', hash);
        expect(verified).toBe(true);
    });

    it('fails to verify an invalid password', async () => {
        const hash = await hashPassword('ThisPassword');
        const verified = await verifyPasswordWithHash('ThatPassword', hash);
        expect(verified).toBe(false);
    });
});
