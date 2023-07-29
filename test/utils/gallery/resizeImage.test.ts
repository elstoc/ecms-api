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
    let toBuffer: jest.Mock;
    const fileContents = 'file-contents';
    const fileBuffer = Buffer.from(fileContents);

    beforeEach(() => {
        resize = jest.fn().mockReturnThis();
        strip = jest.fn().mockReturnThis();
        quality = jest.fn().mockReturnThis();
        borderColor = jest.fn().mockReturnThis();
        border = jest.fn().mockReturnThis();
        toBuffer = jest.fn().mockReturnThis();

        const spy = jest.spyOn(gm, 'default');
        spy.mockImplementation(() => ({
            resize,
            strip,
            quality,
            borderColor,
            border,
            toBuffer,
        } as any));

    });

    it('Calls the appropriate imageMagick functions with the correct parameters', () => {
        resizeImage(fileBuffer, 10, 20, 30);

        expect(gm).toBeCalledWith(fileBuffer);
        expect(resize).toBeCalledWith(10, 20);
        expect(quality).toBeCalledWith(30);
        expect(strip).toBeCalledWith();
        expect(borderColor).toBeCalledWith('rgb(32,32,32)');
        expect(border).toBeCalledWith(2, 2);
        expect(toBuffer.mock.calls[0][0]).toBe('JPG');
    });

    it('resolves awaited promise when there is no error', () => {
        const resizePromise = resizeImage(fileBuffer, 10, 20, 30);
        const toBufferCallback = toBuffer.mock.calls[0][1];
        toBufferCallback();
        expect(resizePromise).resolves.toBeUndefined();
    });

    it('rejects awaited promise with error when there is an error', () => {
        const resizePromise = resizeImage(fileBuffer, 10, 20, 30);
        const toBufferCallback = toBuffer.mock.calls[0][1];
        toBufferCallback(new Error('something wrong'));
        expect(resizePromise).rejects.toMatch('Image resize failed: something wrong');
    });
});
