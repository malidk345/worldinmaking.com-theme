import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { toSlug } from '../../utils/slug';

describe('toSlug', () => {
    it('should convert a simple string to a slug', () => {
        assert.equal(toSlug('Hello World'), 'hello-world');
    });

    it('should remove non-word characters', () => {
        assert.equal(toSlug('Hello! @World#'), 'hello-world');
    });

    it('should replace multiple spaces and underscores with a single hyphen', () => {
        assert.equal(toSlug('hello   world___test'), 'hello-world-test');
    });

    it('should remove leading and trailing hyphens', () => {
        assert.equal(toSlug('---hello-world---'), 'hello-world');
    });

    it('should return an empty string for null or undefined', () => {
        assert.equal(toSlug(null), '');
        assert.equal(toSlug(undefined), '');
    });

    it('should return an empty string for non-string inputs', () => {
        // @ts-expect-error - testing invalid input types
        assert.equal(toSlug(123), '');
        // @ts-expect-error - testing invalid input types
        assert.equal(toSlug({}), '');
    });

    it('should handle strings that become empty after slugification', () => {
        assert.equal(toSlug('!@#$%^&*()'), '');
        assert.equal(toSlug('   '), '');
    });
});
