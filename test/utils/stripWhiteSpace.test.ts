import { stripWhiteSpace } from '../../src/utils';

it('removes all whitespace from a string', () => {
    const stringToStrip = `This is a 
                           string       that    needs
                           whitespace stripping`;
    const expectedStrippedString = 'This is a string that needs whitespace stripping';
    
    const strippedString = stripWhiteSpace(stringToStrip);

    expect(strippedString).toBe(expectedStrippedString);
});
