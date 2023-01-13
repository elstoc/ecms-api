import argon2 from 'argon2';
import crypto from 'crypto';

const hashConfig = {
    parallelism: 1,
    memoryCost: 64000,
    timeCost: 3
};
 
export const hashPassword = async (password: string): Promise<string> => {
    const salt = crypto.randomBytes(16);
    return await argon2.hash(password, {
        ...hashConfig,
        salt,
    });
};
 
export const verifyPasswordWithHash = async (password: string, hash: string): Promise<boolean> => {
    return await argon2.verify(hash, password, hashConfig);
};
