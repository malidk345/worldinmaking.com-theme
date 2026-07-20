import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { getExcerpt } from '../../lib/markdown';

describe('markdown', () => {
    describe('getExcerpt', () => {
        it('should return empty string for null or undefined', () => {
            assert.equal(getExcerpt(null), '');
            assert.equal(getExcerpt(undefined), '');
        });

        it('should return exact string if length is within limits', () => {
            assert.equal(getExcerpt('Hello world', 50), 'Hello world');
            assert.equal(getExcerpt('Hello world', 11), 'Hello world');
        });

        it('should truncate string at specified length and append ...', () => {
            assert.equal(getExcerpt('Hello world, this is a long text', 11), 'Hello world...');
        });

        it('should trim string before appending ... if truncation ends in whitespace', () => {
            assert.equal(getExcerpt('Hello world this is a test', 12), 'Hello world...');
        });

        it('should strip markdown formatting before generating excerpt', () => {
            assert.equal(getExcerpt('**Hello** [world](https://example.com)', 50), 'Hello world');
            assert.equal(getExcerpt('**Hello** [world](https://example.com)', 5), 'Hello...');
        });

        it('should use default length of 150', () => {
            const longText = 'a'.repeat(200);
            const expected = 'a'.repeat(150) + '...';
            assert.equal(getExcerpt(longText), expected);
        });
    });
});
