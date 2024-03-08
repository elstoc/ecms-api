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

        const spy = jest.spyOn(gm, 'default') as jest.Mock;
        spy.mockImplementation(() => ({
            resize,
            strip,
            quality,
            borderColor,
            border,
            toBuffer,
        } as any));

    });

    it('Calls the appropriate imageMagick functions with the correct parameters (stripExif: true, addBorder: true)', () => {
        const resizeOptions = { width: 10, height: 20, quality: 30, stripExif: true, addBorder: true };
        resizeImage(fileBuffer, resizeOptions as any);

        expect(gm).toHaveBeenCalledWith(fileBuffer);
        expect(resize).toHaveBeenCalledWith(10, 20);
        expect(quality).toHaveBeenCalledWith(30);
        expect(strip).toHaveBeenCalledWith();
        expect(borderColor).toHaveBeenCalledWith('rgb(60,60,60)');
        expect(border).toHaveBeenCalledWith(2, 2);
        expect(toBuffer.mock.calls[0][0]).toBe('JPG');
    });

    it('Calls the appropriate imageMagick functions with the correct parameters (stripExif: false)', () => {
        const resizeOptions = { width: 10, height: 20, quality: 30, stripExif: false, addBorder: true };
        resizeImage(fileBuffer, resizeOptions as any);

        expect(gm).toHaveBeenCalledWith(fileBuffer);
        expect(resize).toHaveBeenCalledWith(10, 20);
        expect(quality).toHaveBeenCalledWith(30);
        expect(strip).not.toHaveBeenCalled();
        expect(borderColor).toHaveBeenCalledWith('rgb(60,60,60)');
        expect(border).toHaveBeenCalledWith(2, 2);
        expect(toBuffer.mock.calls[0][0]).toBe('JPG');
    });

    it('Calls the appropriate imageMagick functions with the correct parameters (addBorder: true)', () => {
        const resizeOptions = { width: 10, height: 20, quality: 30, stripExif: true, addBorder: false };
        resizeImage(fileBuffer, resizeOptions as any);

        expect(gm).toHaveBeenCalledWith(fileBuffer);
        expect(resize).toHaveBeenCalledWith(10, 20);
        expect(quality).toHaveBeenCalledWith(30);
        expect(strip).toHaveBeenCalledWith();
        expect(borderColor).not.toHaveBeenCalled();
        expect(border).not.toHaveBeenCalled();
        expect(toBuffer.mock.calls[0][0]).toBe('JPG');
    });

    it('resolves awaited promise when there is no error', () => {
        const resizeOptions = { width: 10, height: 20, quality: 30, stripExif: true, addBorder: true };
        const resizePromise = resizeImage(fileBuffer, resizeOptions as any);
        const toBufferCallback = toBuffer.mock.calls[0][1];
        toBufferCallback();
        expect(resizePromise).resolves.toBeUndefined();
    });

    it('rejects awaited promise with error when there is an error', () => {
        const resizeOptions = { width: 10, height: 20, quality: 30, stripExif: true, addBorder: true };
        const resizePromise = resizeImage(fileBuffer, resizeOptions as any);
        const toBufferCallback = toBuffer.mock.calls[0][1];
        toBufferCallback(new Error('something wrong'));
        expect(resizePromise).rejects.toMatch('Image resize failed: something wrong');
    });
});
