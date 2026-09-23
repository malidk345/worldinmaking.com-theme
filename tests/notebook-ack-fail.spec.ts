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
    expect(footnoteFn).toContain("error: 'selection_ambiguous'");
    expect(footnoteFn).toContain('findUniqueMatch');
    // Fail-closed: no silent append-to-end of footnote anchor; no first-hit indexOf
    expect(footnoteFn).not.toContain('${footnoteAnchor}\n\n');
    expect(footnoteFn).not.toContain('fnMatch');
    expect(footnoteFn).not.toContain('indexOf(spanText)');
    expect(footnoteFn).not.toContain('indexOf(selection)');
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

  test('bound insert/rewrite never overwrites target with most-recent on non-editor', async () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/notebook-app/App.tsx'), 'utf-8');
    const start = src.indexOf('const handleInsertText');
    const end = src.indexOf('const handlePatchText');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const fn = src.slice(start, end);
    // Requested notebookId must resolve via getNotebook and open that id — not replace with recent.
    expect(fn).toContain('const requestedId = customEvent.detail?.notebookId');
    expect(fn).toContain("error: 'no_target'");
    expect(fn).toContain("error: 'empty_text'");
    expect(fn).toContain('openNotebookWindow(target.id, target.title)');
    // Bound path must not assign recent at all (unbound else-if may still use recent).
    const boundBlockStart = fn.indexOf('if (requestedId)');
    const unboundStart = fn.indexOf('} else if (routeRef.current.page !== \'editor\'');
    expect(boundBlockStart).toBeGreaterThan(-1);
    expect(unboundStart).toBeGreaterThan(boundBlockStart);
    const boundBlock = fn.slice(boundBlockStart, unboundStart);
    expect(boundBlock).not.toContain('target = recent');
    expect(boundBlock).toContain('getNotebook(requestedId)');
  });

  test('OS action in-flight re-entry does not claim executed:true', async () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/components/ClaudeWorkspaceChat/index.tsx'),
      'utf-8'
    );
    const start = src.indexOf('const executeOSAction =');
    expect(start).toBeGreaterThan(-1);
    const slice = src.slice(start, start + 1200);
    expect(slice).toContain('if (action.executed)');
    expect(slice).toContain('executedActionsRef.current.has(key)');
    // Must not promote in-flight (key present, executed falsy) to executed:true.
    expect(slice).not.toMatch(
      /if \(action\.executed \|\| executedActionsRef\.current\.has\(key\)\) \{[\s\S]*?executed: true/
    );
  });

  test('bound replace/annotate/footnote never use another editor markdownRef', async () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/notebook-app/App.tsx'), 'utf-8');
    for (const name of ['handleReplaceSelection', 'handleAddAnnotation', 'handleAddFootnote', 'handlePatchText'] as const) {
      const start = src.indexOf(`const ${name}`);
      expect(start, name).toBeGreaterThan(-1);
      const end =
        name === 'handleAddFootnote'
          ? src.indexOf("window.addEventListener('wimNotebookAddFootnote'")
          : name === 'handlePatchText'
            ? src.indexOf('const handleSetTitle')
            : name === 'handleReplaceSelection'
              ? src.indexOf('const handleAddAnnotation')
              : src.indexOf('const handleAddFootnote');
      expect(end, name).toBeGreaterThan(start);
      const fn = src.slice(start, end);
      // Missing bound id must nack — never silently keep current notebook.
      expect(fn).toContain("error: 'no_target'");
      expect(fn).toContain('const requestedId');
      expect(fn).toContain('getNotebook(requestedId)');
      // Live buffer only when editor belongs to target (insert/patch parity).
      expect(fn).toContain("notebookRef.current?.id === target.id");
      expect(fn).not.toMatch(/const current = markdownRef\.current \|\| target\.content/);
    }
  });

});
