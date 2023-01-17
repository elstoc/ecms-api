/* eslint-disable  @typescript-eslint/no-explicit-any */
import { resizeImage } from '../../../src/utils';
import * as gm from 'gm';

jest.mock('gm');

describe('That resizeImage', () => {
    let resize: jest.Mock;
    let strip: jest.Mock;
    let quality: jest.Mock;
    let borderColor: jest.Mock;
    let border: jest.Mock;
    let write: jest.Mock;

    beforeEach(() => {
        resize = jest.fn().mockReturnThis();
        strip = jest.fn().mockReturnThis();
        quality = jest.fn().mockReturnThis();
        borderColor = jest.fn().mockReturnThis();
        border = jest.fn().mockReturnThis();
        write = jest.fn().mockReturnThis();

        const spy = jest.spyOn(gm, 'default');
        spy.mockImplementation(() => ({
            resize,
            strip,
            quality,
            borderColor,
            border,
            write,
        } as any));

    });

    it('Calls the appropriate imageMagick functions with the correct parameters', () => {
        resizeImage('/in/path', '/out/path', 10, 20, 30);

        expect(gm).toBeCalledWith('/in/path');
        expect(resize).toBeCalledWith(10, 20);
        expect(quality).toBeCalledWith(30);
        expect(strip).toBeCalledWith();
        expect(borderColor).toBeCalledWith('rgb(32,32,32)');
        expect(border).toBeCalledWith(2, 2);
        expect(write.mock.calls[0][0]).toBe('/out/path');
    });

    it('resolves awaited promise when there is no error', () => {
        const resizePromise = resizeImage('/in/path', '/out/path', 10, 20, 30);
        const writeCallback = write.mock.calls[0][1];
        writeCallback();
        expect(resizePromise).resolves.toBeUndefined();
    });

    it('rejects awaited promise with error when there is an error', () => {
        const resizePromise = resizeImage('/in/path', '/out/path', 10, 20, 30);
        const writeCallback = write.mock.calls[0][1];
        writeCallback(new Error('something wrong'));
        expect(resizePromise).rejects.toMatch('Image resize failed: something wrong');
    });
});
