/* eslint-disable  @typescript-eslint/no-explicit-any */
import * as sizeOf from 'image-size';
import { getImageDimensions } from '../../../src/utils';

jest.mock('image-size');
const inFileBuffer = Buffer.from('imageFile');

describe('That getImageDimensions', () => {
    let mockSizeOfSync: jest.SpyInstance;

    beforeEach(() => {
        mockSizeOfSync = jest.spyOn(sizeOf, 'default');
        mockSizeOfSync.mockReturnValue({ width: 10, height: 20 });
    });

    it('calls imageSize with input path', () => {
        getImageDimensions(inFileBuffer);

        const inputParam = mockSizeOfSync.mock.calls[0][0];
        expect(inputParam).toBe(inFileBuffer);
    });

    it('returns the height and width returned from resize', () => {
        const returnData = getImageDimensions(inFileBuffer);

        const expectedResult = { width: 10, height: 20 };
        expect(returnData).toStrictEqual(expectedResult);
    });
});
