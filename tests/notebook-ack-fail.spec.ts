import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Fail-closed nacks are present', () => {
  test('App.tsx contains fail acks for footnote, annotation, replace', async () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/notebook-app/App.tsx'), 'utf-8');
    expect(src).toContain("error: 'empty_text'");
    expect(src).toContain("error: 'selection_not_found'");
    expect(src).toContain("error: 'span_not_found'");
    expect(src).toContain("error: 'selection_ambiguous'");

    const footnoteStart = src.indexOf('const handleAddFootnote');
    const footnoteEnd = src.indexOf('window.addEventListener(\'wimNotebookAddFootnote\'');
    expect(footnoteStart).toBeGreaterThan(-1);
    expect(footnoteEnd).toBeGreaterThan(footnoteStart);
    const footnoteFn = src.slice(footnoteStart, footnoteEnd);
    expect(footnoteFn).toContain("error: 'span_not_found'");
    expect(footnoteFn).toContain("error: 'selection_not_found'");
    // Fail-closed: no silent append-to-end of footnote anchor
    expect(footnoteFn).not.toContain('${footnoteAnchor}\n\n');
    expect(footnoteFn).not.toContain('fnMatch');
  });

  test('replace selection uses Diff Apply unique-match parity', async () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/notebook-app/App.tsx'), 'utf-8');
    expect(src).toContain('findUniqueMatch');
    expect(src).toContain("error: 'selection_ambiguous'");
    const patch = fs.readFileSync(path.join(process.cwd(), 'src/lib/notebook-patch-text.ts'), 'utf-8');
    expect(patch).toContain('export function findUniqueMatch');
    expect(patch).toContain('export function uniqueIndex');
  });

  test('ClaudeWorkspaceChat checks for ok === false', async () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/components/ClaudeWorkspaceChat/index.tsx'), 'utf-8');
    expect(src).toContain("customEvent.detail?.ok === false");
  });
});
