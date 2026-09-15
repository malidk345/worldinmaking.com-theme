import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { resolveDiffApplySpanText, diffApplyButtonLabel } from '../src/lib/chat/diff-apply';

test.describe('resolveDiffApplySpanText', () => {
  test('prefers live text if it has length >= 2', () => {
    expect(resolveDiffApplySpanText('hi', 'sticky-text')).toBe('hi');
    expect(resolveDiffApplySpanText('hello world', null)).toBe('hello world');
  });

  test('falls back to sticky text if live text is less than 2 chars', () => {
    expect(resolveDiffApplySpanText('a', 'sticky-text')).toBe('sticky-text');
    expect(resolveDiffApplySpanText('', 'sticky-text')).toBe('sticky-text');
  });

  test('returns empty string if both are missing or insufficient', () => {
    expect(resolveDiffApplySpanText('a', null)).toBe('');
    expect(resolveDiffApplySpanText('', null)).toBe('');
  });
});

test.describe('diffApplyButtonLabel', () => {
  test('maps idle / applied / failed', () => {
    expect(diffApplyButtonLabel('idle')).toBe('Apply to document');
    expect(diffApplyButtonLabel('applied')).toBe('Applied ✓');
    expect(diffApplyButtonLabel('failed')).toBe("Couldn't apply");
  });
});

test.describe('Diff Apply fail-closed wiring', () => {
  test('ChatMessage settles failed on dispatch miss, nack, and ack timeout', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/components/ClaudeWorkspaceChat/components/ChatMessage.tsx'),
      'utf-8'
    );
    expect(src).toContain("settle(detail?.ok ? 'applied' : 'failed')");
    expect(src).toContain("if (!ok) settle('failed')");
    expect(src).toContain("settle('failed'), 4000");
    expect(src).toContain('diffApplyButtonLabel(applyStatus)');
    // Sticky consumed only on success (#652)
    expect(src).toContain("if (status === 'applied') consumeStickyNotebookSelection()");
    // Live span must be notebook-scoped so chat/UI selection cannot override sticky
    expect(src).toContain('readNotebookSelection()');
    expect(src).not.toContain("window.getSelection()?.toString().trim()");
  });
});
