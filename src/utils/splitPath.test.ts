import { splitPath } from '.';

describe('splitPath', () => {
    it('returns a single array element for a single item starting with a slash', () => {
        expect(splitPath('/test')).toEqual(['test']);
    });

    it('returns a single array element for a single item not starting with a slash', () => {
        expect(splitPath('test')).toEqual(['test']);
    });

    it('returns an array of non-empty elements for long path starting and ending in a slash', () => {
        expect(splitPath('/path/to/test/dir/')).toEqual(['path','to','test','dir']);
    });

    it('returns an array of non-empty elements for long path not starting or ending in a slash', () => {
        expect(splitPath('path/to/test/dir')).toEqual(['path','to','test','dir']);
    });
});
