import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Fail-closed nacks are present', () => {
  test('App.tsx contains fail acks for footnote, annotation, replace', async () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/notebook-app/App.tsx'), 'utf-8');
    expect(src).toContain("error: 'empty_text'");
    expect(src).toContain("error: 'selection_not_found'");
    expect(src).toContain("error: 'span_not_found'");
  });

  test('ClaudeWorkspaceChat checks for ok === false', async () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/components/ClaudeWorkspaceChat/index.tsx'), 'utf-8');
    expect(src).toContain("customEvent.detail?.ok === false");
  });
});
