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

  test('bound setTitle never adopts another editor buffer (idle persist poison)', async () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/notebook-app/App.tsx'), 'utf-8');
    const start = src.indexOf('const handleSetTitle');
    const end = src.indexOf('const handleReplaceSelection');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const fn = src.slice(start, end);
    expect(fn).toContain("error: 'empty_text'");
    expect(fn).toContain("error: 'no_target'");
    expect(fn).toContain('openNotebookWindow');
    expect(fn).toContain('editorOwnsTarget');
    // Live markdown must be swapped from target.content when adopting a different notebook.
    expect(fn).toContain("setMarkdown(target.content || '')");
    // Must not unconditionally setCurrentNotebook + setTitle without the ownership branch.
    expect(fn).toContain('if (editorOwnsTarget)');
  });


  test('bound replace/annotate/footnote adopt setTitle with content (idle title poison)', async () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/notebook-app/App.tsx'), 'utf-8');
    for (const name of ['handleReplaceSelection', 'handleAddAnnotation', 'handleAddFootnote'] as const) {
      const start = src.indexOf(`const ${name}`);
      expect(start, name).toBeGreaterThan(-1);
      const end =
        name === 'handleAddFootnote'
          ? src.indexOf("window.addEventListener('wimNotebookAddFootnote'")
          : name === 'handleReplaceSelection'
            ? src.indexOf('const handleAddAnnotation')
            : src.indexOf('const handleAddFootnote');
      expect(end, name).toBeGreaterThan(start);
      const fn = src.slice(start, end);
      // Insert/patch/#822 parity: adopting another notebook must setTitle(target.title)
      // so idle persist cannot write the previous editor title into the bound target.
      expect(fn).toContain('setTitle(target.title)');
      expect(fn).toContain('setCurrentNotebook(target)');
      expect(fn).toContain('setMarkdown(');
    }
    // Insert + patch already had setTitle — keep the invariant explicit.
    for (const name of ['handleInsertText', 'handlePatchText'] as const) {
      const start = src.indexOf(`const ${name}`);
      const end = name === 'handleInsertText' ? src.indexOf('const handlePatchText') : src.indexOf('const handleSetTitle');
      const fn = src.slice(start, end);
      expect(fn, name).toContain('setTitle(target.title)');
    }
  });

  test('assistant-actions insert_notebook_block fails closed on missing bound id', async () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/lib/assistant-actions.ts'), 'utf-8');
    const start = src.indexOf('function resolveNotebook');
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf('export function applyAssistantAction');
    const fn = src.slice(start, end);
    // When id is provided, must return getNotebook(id) only — never fall through to first notebook.
    expect(fn).toContain('return getNotebook(id) || null');
    expect(fn).not.toMatch(/if \(id\) \{[\s\S]*?if \(found\) return found[\s\S]*?\}[\s\S]*?return getNotebooks/);
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


  test('create_notebook OS Apply binds chat + stamps notebookId', async () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/components/ClaudeWorkspaceChat/index.tsx'),
      'utf-8'
    );
    const start = src.indexOf("if (action.type === 'create_notebook')");
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf("} else if (action.type === 'insert_notebook_block')", start);
    expect(end).toBeGreaterThan(start);
    const block = src.slice(start, end);
    // Must bind immediately — notebook App only binds on Ask AI click.
    expect(block).toContain('bindNotebookChat({ notebookId: nb.id');
    expect(block).toContain('notebookId: nb.id');
    expect(block).toContain('void pushChatToRemote(stamped)');
    expect(block).toContain("wimNotebookAck");
    // Stamp must precede bind: applyBind creates chat-nb-* when no chat has notebookId yet.
    const stampAt = block.indexOf('setChats((prev) =>');
    const bindAt = block.indexOf('bindNotebookChat({ notebookId: nb.id');
    expect(stampAt).toBeGreaterThan(-1);
    expect(bindAt).toBeGreaterThan(-1);
    expect(stampAt).toBeLessThan(bindAt);
  });


  test('handleResetData clears notebook↔chat bind', async () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/components/ClaudeWorkspaceChat/index.tsx'),
      'utf-8'
    );
    const start = src.indexOf('const handleResetData');
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf('useEffect(() => {', start);
    expect(end).toBeGreaterThan(start);
    const fn = src.slice(start, end);
    // Reset chat data must wipe bind storage (local+session) + notify applyBind(null).
    expect(fn).toContain('clearNotebookChatBind()');
    expect(src).toContain('clearNotebookChatBind,');
  });



  test('identity owner change clears notebook↔chat bind', async () => {
    const bindSrc = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/notebook-chat-bind.ts'),
      'utf-8'
    );
    const chatSrc = fs.readFileSync(
      path.join(process.cwd(), 'src/components/ClaudeWorkspaceChat/index.tsx'),
      'utf-8'
    );
    // Global bind key is not owner-namespaced — must clear on logout/account switch.
    expect(bindSrc).toContain('syncNotebookChatBindForIdentity');
    expect(bindSrc).toContain('WIM_IDENTITY_EVENT');
    expect(bindSrc).toContain('lastBindOwnerKey');
    expect(chatSrc).toContain('syncNotebookChatBindForIdentity()');
  });

  test('AI digest collectors stay on active owner notebooks/chats only', async () => {
    const noticesSrc = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/assistant-notices.ts'),
      'utf-8'
    );
    const worldSrc = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/assistant-world.ts'),
      'utf-8'
    );
    const nbSrc = fs.readFileSync(
      path.join(process.cwd(), 'src/notebook-app/scenes/notebooks/notebookStorage.ts'),
      'utf-8'
    );
    // Must not scan every wim_notebooks_v3:* on the device into AI context.
    expect(noticesSrc).toContain("namespacedStorageKey('wim_notebooks_v3'");
    expect(noticesSrc).toContain('getAuthUserId()');
    expect(noticesSrc).not.toContain("key.startsWith('wim_notebooks_v3')");
    // Chat titles for world digest use chat-local policy (no signed-in global fallback).
    expect(worldSrc).toContain('readChatsFromLocalStorage');
    expect(worldSrc).not.toContain("localStorage.getItem(key) || window.localStorage.getItem('claude_workspace_chats_v7')");
    // Notebook LS read: guest-only legacy; never into signed-in.
    expect(nbSrc).toContain('!getAuthUserId()');
    expect(nbSrc).toContain('localStorage.getItem(STORAGE_KEY_BASE)');
  });

  test('identity namespaces projects/settings/scratchpad and clears session leftovers', async () => {
    const workspaceSrc = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/workspace-local.ts'),
      'utf-8'
    );
    const chatSrc = fs.readFileSync(
      path.join(process.cwd(), 'src/components/ClaudeWorkspaceChat/index.tsx'),
      'utf-8'
    );
    const scratchSrc = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/scratchpad-store.ts'),
      'utf-8'
    );
    const bindSrc = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/notebook-chat-bind.ts'),
      'utf-8'
    );
    const byokSrc = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/byok-vault.ts'),
      'utf-8'
    );
    const quotaSrc = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/chat-usage-client.ts'),
      'utf-8'
    );
    // Projects/settings must be owner-namespaced (systemPrompt leak class).
    expect(workspaceSrc).toContain("namespacedStorageKey(PROJECT_STORAGE_BASE");
    expect(workspaceSrc).toContain("namespacedStorageKey(SETTINGS_STORAGE_BASE");
    expect(workspaceSrc).toContain('syncWorkspaceLocalForIdentity');
    expect(chatSrc).toContain('writeLocalProjects(projects)');
    expect(chatSrc).toContain('writeLocalSettings(settings)');
    expect(chatSrc).toContain('setProjects(readLocalProjects(INITIAL_PROJECTS))');
    expect(chatSrc).toContain('syncWorkspaceLocalForIdentity()');
    // Scratchpad / BYOK / sticky / quota — same global-leak class as bind.
    expect(scratchSrc).toContain("namespacedStorageKey(STORAGE_BASE");
    expect(scratchSrc).toContain('WIM_IDENTITY_EVENT');
    expect(byokSrc).toContain("namespacedStorageKey(STORAGE_BASE");
    expect(bindSrc).toContain('clearStickyNotebookSelection');
    expect(quotaSrc).toContain('WIM_IDENTITY_EVENT');
    expect(quotaSrc).toContain('clearCachedTokenQuota');
  });

});
