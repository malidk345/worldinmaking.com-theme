import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { stripMarkdown, getExcerpt } from '../../lib/markdown.ts';

describe('markdown utilities', () => {
    describe('stripMarkdown', () => {
        it('should handle null, undefined, and empty string', () => {
            assert.equal(stripMarkdown(null), '');
            assert.equal(stripMarkdown(undefined), '');
            assert.equal(stripMarkdown(''), '');
        });

        it('should remove headers', () => {
            assert.equal(stripMarkdown('# Header 1'), 'Header 1');
            assert.equal(stripMarkdown('## Header 2'), 'Header 2');
            assert.equal(stripMarkdown('###### Header 6'), 'Header 6');
            assert.equal(stripMarkdown('#   Header with spaces'), 'Header with spaces');
        });

        it('should remove bold and italic syntax', () => {
            assert.equal(stripMarkdown('**bold text**'), 'bold text');
            assert.equal(stripMarkdown('__bold text__'), 'bold text');
            assert.equal(stripMarkdown('*italic text*'), 'italic text');
            assert.equal(stripMarkdown('_italic text_'), 'italic text');
            assert.equal(stripMarkdown('***bold italic***'), 'bold italic'); // Regex logic handles inner content, but let's test a simple combination
            assert.equal(stripMarkdown('Some **bold** and *italic* text.'), 'Some bold and italic text.');
        });

        it('should remove links', () => {
            assert.equal(stripMarkdown('[link text](http://example.com)'), 'link text');
            assert.equal(stripMarkdown('Check out [this link](http://example.com) for more info.'), 'Check out this link for more info.');
            assert.equal(stripMarkdown('[link with spaces](http://example.com/some page)'), 'link with spaces');
        });

        it('should remove images completely', () => {
            assert.equal(stripMarkdown('![alt text](image.jpg)'), '');
            assert.equal(stripMarkdown('Look at this image: ![cat](cat.png) cute, right?'), 'Look at this image:  cute, right?');
        });

        it('should remove blockquotes', () => {
            assert.equal(stripMarkdown('> This is a quote'), 'This is a quote');
            assert.equal(stripMarkdown('>   Quote with spaces'), 'Quote with spaces');
            assert.equal(stripMarkdown('>> Nested quote'), '>> Nested quote'); // Given current regex `^>\s+`, it removes the first `> `
        });

        it('should remove inline and block code', () => {
            assert.equal(stripMarkdown('Here is some `inline code`.'), 'Here is some inline code.');
            assert.equal(stripMarkdown('```\nconst x = 1;\n```'), '');
            assert.equal(stripMarkdown('Code block: ```javascript\nconsole.log("hello");\n``` done.'), 'Code block:  done.');
        });

        it('should remove unordered and ordered lists', () => {
            assert.equal(stripMarkdown('* Item 1\n* Item 2'), 'Item 1\nItem 2');
            assert.equal(stripMarkdown('- Item A\n- Item B'), 'Item A\nItem B');
            assert.equal(stripMarkdown('+ Item X\n+ Item Y'), 'Item X\nItem Y');
            assert.equal(stripMarkdown('1. First item\n2. Second item\n10. Tenth item'), 'First item\nSecond item\nTenth item');
        });

        it('should remove horizontal rules', () => {
            assert.equal(stripMarkdown('---'), '');
            assert.equal(stripMarkdown('Text above\n---\nText below'), 'Text above\nText below');
        });

        it('should remove basic HTML tags', () => {
            assert.equal(stripMarkdown('<p>Paragraph</p>'), 'Paragraph');
            assert.equal(stripMarkdown('<a href="foo">Link</a>'), 'Link');
            assert.equal(stripMarkdown('<strong>Bold</strong>'), 'Bold');
            assert.equal(stripMarkdown('<script>alert("xss")</script>'), 'alert("xss")');
        });

        it('should handle a complex combination', () => {
            const complexMarkdown = `
# Main Title

This is a **bold** paragraph with an *italic* word and a [link](https://example.com).

## Subtitle
* List item 1
* List item 2
  * Nested item

> A profound quote

Code snippet:
\`\`\`typescript
function test() {
    return true;
}
\`\`\`

And an image: ![Cat](cat.jpg)
---
The end.
            `.trim();

            // The regex matching can be slightly loose with spacing, so let's just make sure the content is stripped and spacing is normalized mostly.
            // A more robust check might be to assert includes/doesn't include.
            const result = stripMarkdown(complexMarkdown);

            assert.ok(!result.includes('# Main Title'));
            assert.ok(!result.includes('**bold**'));
            assert.ok(!result.includes('*italic*'));
            assert.ok(!result.includes('[link]'));
            assert.ok(!result.includes('```'));
            assert.ok(!result.includes('![Cat]'));
            assert.ok(result.includes('Main Title'));
            assert.ok(result.includes('bold paragraph'));
            assert.ok(result.includes('italic word'));
            assert.ok(result.includes('link'));
        });
    });

    describe('getExcerpt', () => {
        it('should return stripped text if shorter than length limit', () => {
            assert.equal(getExcerpt('# Short text', 50), 'Short text');
            assert.equal(getExcerpt('**Bold text**', 15), 'Bold text');
        });

        it('should truncate text longer than length limit and append ...', () => {
            assert.equal(getExcerpt('This is a very long string that should be truncated.', 10), 'This is a...');
            assert.equal(getExcerpt('# Heading\nSome long text that goes on and on', 20), 'Heading\nSome long te...');
        });

        it('should handle empty cases', () => {
            assert.equal(getExcerpt(null), '');
            assert.equal(getExcerpt(''), '');
        });
    });
});
