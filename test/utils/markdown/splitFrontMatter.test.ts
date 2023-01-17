import { splitFrontMatter } from '../../../src/utils';

describe('That splitFrontMatter', () => {
    it('returns entire string as content if there is no frontmatter', () => {
        const inText = 'this\nis\nsome\ncontent';

        const [yaml, content] = splitFrontMatter(inText);

        expect(yaml).toBe('');
        expect(content).toBe(inText);
    });

    it('returns entire string as content if opening separator is not on first line', () => {
        const inText = 'this\n---\nis\nsome\ncontent';

        const [yaml, content] = splitFrontMatter(inText);

        expect(yaml).toBe('');
        expect(content).toBe(inText);
    });

    it('returns entire string (except first line) as yaml if there is no closing separator', () => {
        const inText = '---\nthis\nis\nsome\nunclosed\nyaml';

        const [yaml, content] = splitFrontMatter(inText);

        const expectedYaml = 'this\nis\nsome\nunclosed\nyaml';
        expect(yaml).toBe(expectedYaml);
        expect(content).toBe('');
    });

    it('returns separated yaml/content where there is a separator on line 1 and another somewhere after', () => {
        const inText = '---\nthis\nis\nsome\nyaml\n---\nthis\nis\nsome\ncontent';

        const [yaml, content] = splitFrontMatter(inText);

        const expectedYaml = 'this\nis\nsome\nyaml';
        const expectedContent = 'this\nis\nsome\ncontent';
        expect(yaml).toBe(expectedYaml);
        expect(content).toBe(expectedContent);
    });
});
