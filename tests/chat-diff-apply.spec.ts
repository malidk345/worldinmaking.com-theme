import { describe, it, expect } from 'vitest';
import { resolveDiffApplySpanText } from '../src/lib/chat/diff-apply';

describe('resolveDiffApplySpanText', () => {
  it('prefers live text if it has length >= 2', () => {
    expect(resolveDiffApplySpanText('hi', 'sticky-text')).toBe('hi');
    expect(resolveDiffApplySpanText('hello world', null)).toBe('hello world');
  });

  it('falls back to sticky text if live text is less than 2 chars', () => {
    expect(resolveDiffApplySpanText('a', 'sticky-text')).toBe('sticky-text');
    expect(resolveDiffApplySpanText('', 'sticky-text')).toBe('sticky-text');
  });

  it('returns empty string if both are missing or insufficient', () => {
    expect(resolveDiffApplySpanText('a', null)).toBe('');
    expect(resolveDiffApplySpanText('', null)).toBe('');
  });
});
