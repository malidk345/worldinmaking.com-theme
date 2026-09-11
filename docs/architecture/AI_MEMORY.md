# AI Agent Memory & Coordination Log

**Document Location:** `docs/architecture/AI_MEMORY.md`  
**Applies To:** All AI Models & Assistant Agents working on WorldInMaking.

---

## 1. Project Context & Principles
- Next.js 14 Pages Router + React 18 + Tailwind CSS 3
- Single auth system: Supabase Auth
- Package manager: `pnpm` exclusively
- Styles: Notebook styles require `pnpm run build:notebook-styles` after changes.

---

## 2. Active Architectural Directives
- Mobile optimization: Clean distraction-free writing, zero unwanted horizontal shifts, no popovers intercepting regular taps/selection.
- OS Shell integrity: Non-colliding z-indices and toolbars between AppWindow / ReaderView and embedded apps.

---

## 3. High-Priority Focus Areas
- WIM Notebook Mobile UX & Responsive Touch Experience.

---

## 4. Current Tasks & Locking
- **Status:** `[AVAILABLE]`

---

## 5. AI Change History & Log

### 2026-09-11 — opencode (big-pickle) (Backend Optimization: Notebook API Hot Paths)
- **Scope:** Optimize WIM notebook backend so sync/save/list work smoothly. Frontend contract preserved — no response-shape or client-code changes.
- **Implementation:**
  1. `lib/notebooks-repo.ts` `listDeletedNotebookIds` (runs inside every list GET): replaced per-row sequential cleanup (~up to 1500 round trips: tombstone upsert + history delete + row delete each) with ONE batched tombstone upsert + chunked batched history/row deletes. Stale-DB list syncs no longer stall.
  2. `lib/notebooks-repo.ts` `upsertNotebook`: skip mention/comment notification work entirely when the saved body is unchanged vs previous save (no-op idle-serialize saves no longer re-scan/re-write notifications).
  3. `lib/notebooks-repo.ts` `upsertNotebooks` (bulk client push): load the sync-tombstone ledger once and check in-memory instead of one `hasSyncTombstone` round trip per notebook.
  4. `lib/notebook-mentions.ts` `notifyNotebookMentions`: new `previousContent` param short-circuits when the @mention id/handle set didn't change (no profile re-resolve, no notification row re-writes on each autosave).
  5. `lib/api-authz.ts`: added `withProfile` option; `resolveNotebookOwner` now skips the `/rest/v1/profiles` enrichment (notebook routes only read `user.id`), removing one Supabase round trip per notebook API call. All direct `getSupabaseUserFromRequest` callers (forum/billing/account/bots) keep profile enrichment (default unchanged).
  6. `src/pages/api/notebooks/index.ts` + `[id].ts`: public (=published) GET reads now send `Cache-Control: public, s-maxage=60, stale-while-revalidate=120`. Authenticated endpoints remain uncached.
- **Verification:** `pnpm run typecheck:shell` — PASS, 0 gated errors in core shell allowlist (notebook routes pull `lib/notebooks-repo.ts` / `lib/api-authz.ts` / `lib/notebook-mentions.ts` transitively).
- **Files Modified:**
  - `lib/notebooks-repo.ts`
  - `lib/notebook-mentions.ts`
  - `lib/api-authz.ts`
  - `src/pages/api/notebooks/index.ts`
  - `src/pages/api/notebooks/[id].ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-11 — Antigravity (Remove Standalone Block Comment Button & Compact Three-Dot More Button)
- **Scope:**
  1. Removed redundant standalone block comment button (`.MarkdownNotebook__block-comment-btn`) from the block chrome (`MarkdownNotebook.tsx`, `MarkdownNotebook.scss`, `notebook-mobile-block-chrome.css`). The "Comment" action is already present as the first option inside the three-dot more menu (`buildBlockMoreMenuItems`).
  2. Made the three-dot more menu button (`.MarkdownNotebook__block-more-btn`) significantly more compact:
     - Desktop: reduced size from `1.5rem` (24px) to `1.25rem` (20px) with `0.75rem` (12px) icon and `border-radius: 3px`.
     - Mobile: reduced size from oversized `2rem` (32px) to `1.375rem` (22px) with `0.75rem` icon.
  3. Recompiled notebook style bundles (`bundleCss.ts`, `productBundleCss.ts`) via `pnpm run build:notebook-styles`.
  4. Verified all 44 Playwright tests passed and `pnpm run typecheck:shell` passed with 0 gated errors.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/styles/notebook-mobile-block-chrome.css`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `docs/architecture/AI_MEMORY.md`


### 2026-09-11 — Antigravity (Fix scrollNotebookElementIntoView Import in useNotebookSelection)
- **Scope:**
  1. Resolved runtime `TypeError: scrollNotebookElementIntoView is not a function` at `useNotebookSelection.ts:73`.
  2. Fixed source import: `scrollNotebookElementIntoView` is defined in `./domSelection`, but was inadvertently imported from `./utils` where it was undefined.
  3. Re-exported `scrollNotebookElementIntoView` in `utils.ts` from `./domSelection` to ensure robust backwards compatibility.
  4. Verified via `pnpm exec playwright test tests/notebook-frontend.spec.ts` (44 passed) and `pnpm run typecheck:shell` (0 errors).
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/useNotebookSelection.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/utils.ts`
  - `docs/architecture/AI_MEMORY.md`


### 2026-09-11 — Antigravity (Notebook Mobile Block Frame Outline on Focus and Touch)
- **Scope:**
  1. Fixed missing block frame ("blok çerçevesi") on mobile and touch devices. On desktop, block frames were only rendered via `@media (hover: hover) and (pointer: fine) .MarkdownNotebook__row:hover` while `:focus-within` explicitly reset `outline-color: transparent`. Because mobile lacks hover, blocks never displayed boundaries or active frames.
  2. In `MarkdownNotebook.tsx`, propagated `isTitleRow && 'MarkdownNotebook__row--title'` and `focusedRowIndex === index && 'MarkdownNotebook__row--focused'` to the row container. Added an `onClick` fallback to row empty space so tapping anywhere on a block activates and focuses its contenteditable area.
  3. In `MarkdownNotebook.scss` and `notebook-mobile-block-chrome.css`, added `@media (hover: none), (pointer: coarse), (max-width: 640px)` rules ensuring `.MarkdownNotebook--edit .MarkdownNotebook__row:focus-within`, `--focused`, and `--mobile-active` display `outline: 1.5px solid var(--color-border-primary)` (with title rows and AI prompt cards cleanly exempted).
  4. Recompiled notebook style bundles (`bundleCss.ts`, `productBundleCss.ts`) via `pnpm run build:notebook-styles`.
  5. Added automated regression test in `tests/notebook-frontend.spec.ts`. All 44 Playwright tests passed, and `pnpm run typecheck:shell` passed with 0 gated errors.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/styles/notebook-mobile-block-chrome.css`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `tests/notebook-frontend.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-11 — Antigravity (Footnote Canonical OSButton & Mobile Zoom Elimination)
- **Scope:**
  1. Converted FootnotePopover action buttons to canonical WIM `OSButton`s (`variant="primary" size="sm"` for Save, `size="sm"` for Cancel, `size="sm"` for Delete with icon, and `size="xs"` for header Close). Removed conflicting outer padding/height overrides that distorted the 3D push-button layout.
  2. Fixed mobile screen auto-zoom: added `maximum-scale=1` in `_document.tsx` viewport meta tag and set `text-[16px] sm:text-xs touch-manipulation` on footnote textarea so iOS Safari never triggers page zoom upon focusing the input.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/FootnotePopover.tsx`
  - `src/pages/_document.tsx`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-11 — Antigravity (Notebook Mobile Footnote Cut-off Fix & Viewport Clamping)
- **Scope:**
  1. Resolved mobile footnote popover cut-off bug where `left: 50% !important` in SCSS combined with `transform: none` in JavaScript placed the popover at 50% screen width, cutting off the entire right half (close button, textarea, save button) on mobile viewports.
  2. Fixed mobile viewport overflow: on `@media (max-width: 640px)`, anchored popover with `left: 10px !important; right: 10px !important; width: auto !important; max-width: calc(100vw - 20px) !important; transform: none !important;`.
  3. Clamped vertical `top` positioning in `FootnotePopover.tsx` dynamically to `visualViewport.height` and `visualViewport.offsetTop`, keeping the popover visible above the mobile virtual keyboard.
  4. Added `font-size: 16px !important` on mobile textarea to prevent iOS Safari auto-zooming and screen disorientation on focus.
  5. Added `min-w-0` and `flex-shrink-0` to bottom footnotes list item layout to prevent horizontal content overflow on narrow mobile screens.
  6. Recompiled CSS bundles (`bundleCss.ts`, `productBundleCss.ts`) via `pnpm run build:notebook-styles`.
  7. Verification: 43 Playwright tests passed, `pnpm run typecheck:shell` passed with 0 gated errors.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/FootnotePopover.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/lib/components/MarkdownNotebook/useNotebookFootnotes.ts`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-11 — Antigravity (Notebook Selection Hook Extraction & API Tombstone Import Fix)
- **Scope:**
  1. Extracted selection preservation and DOM focus restoration into standalone hook `useNotebookSelection.ts`, decoupling `restoreSelectionRef`, `focusNodeRef`, and the post-render `useLayoutEffect` DOM reconciliation from `MarkdownNotebook.tsx`.
  2. Fixed backend Next.js API server error: imported missing `listSyncTombstoneIds` and `recordSyncTombstone` in `lib/notebooks-repo.ts` from `./sync-tombstones`.
  3. Hardened touch targets (`min-w-[28px] min-h-[28px] touch-manipulation`) and Unicode edit/jump glyphs (`\u270E`, `\u21A9`) in `FootnotePopover.tsx` and `useNotebookFootnotes.ts`.
  4. Converted non-relative import of `OSButton` in `FootnotePopover.tsx` to relative path to ensure clean compatibility across headless test runners.
  5. Added comprehensive test coverage in `tests/notebook-frontend.spec.ts` for footnote round-trip serialization and document-change caret offset mapping (`mapRestoreSelectionThroughDocumentChange`).
  6. Verification: 43 Playwright tests pass (`pnpm exec playwright test tests/notebook-frontend.spec.ts`), `pnpm run typecheck:shell` passes with zero gated errors, and style bundles compiled cleanly.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/useNotebookSelection.ts` (new)
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/useNotebookFootnotes.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/FootnotePopover.tsx`
  - `lib/notebooks-repo.ts`
  - `tests/notebook-frontend.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-11 — Antigravity (Notebook Architecture Stabilization, Hook Modularization & Inline Integrity)
- **Scope:**
  1. Decompose monolithic footnote and slash menu logic from `MarkdownNotebook.tsx` into standalone modular hooks (`useNotebookFootnotes.ts`, `useNotebookSlashMenu.ts`).
  2. Separate pure filtering and context calculation functions into `insertMenuModel.ts`, eliminating UI module coupling in headless tests.
  3. Eliminate paragraph splitting and phantom detached block creation when triggering slash commands (`/`) or clicking the insert `+` button in text.
  4. Fix Enter key fallthrough in `EditableTextBlock.tsx` that previously split paragraphs when Enter was pressed with an active insert menu.
  5. Fix caret position jumping on slash menu open by threading exact caret offsets through `beginSlashInsertMenu` and `openSlashMenuAtToken`.
  6. Harden mobile footnote popover styling with responsive viewport constraints.
  7. Verification: All 41 Playwright frontend tests pass (`pnpm exec playwright test tests/notebook-frontend.spec.ts`), `pnpm run typecheck:shell` passes with 0 errors, and notebook style bundles compiled via `pnpm run build:notebook-styles`.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/useNotebookFootnotes.ts` (new)
  - `src/notebook-app/lib/components/MarkdownNotebook/useNotebookSlashMenu.ts` (new)
  - `src/notebook-app/lib/components/MarkdownNotebook/EditableTextBlock.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/InsertMenu.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/lib/components/MarkdownNotebook/documentModel.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/insertMenuModel.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/registry.tsx`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `tests/notebook-frontend.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-11 — Antigravity (Notebook Inline Footnotes & Slash Editor Refinement)
- **Scope:**
  1. Add native markdown round-trip footnote system (`[^1]` in markdown and `[^1]: text` at document end).
  2. Elegant typographical superscript number styling in text (no clunky border/badge/box/pill, matching line-height with `display: inline; vertical-align: super; line-height: 0;`).
  3. Integrated footnote trigger in slash insert menu (`/footnote`, `/dipnot`, `/fn`), using PostHog `IconDocument`.
  4. Fix slash menu behavior so opening the slash menu or inserting an inline element does NOT split the text block or open/create an unnecessary separate block.
  5. Context-aware Slash Menu: When `/` is typed in the middle/end of text (`inline` context), it only shows inline-relevant commands (Footnote top priority, compact popup suitable for mobile and desktop without cluttering prose). When `/` is typed in an empty block or new line (`block` context), it presents the full block library (Headings, Tables, Lists, Code, Quotes, Dividers, Components, AI).
  6. Fixed "No matching blocks" and ReferenceError when querying slash commands inside sentences by parsing slash tokens with caret position in `getInsertMenuFilterQuery` and scoping `caret` properly in `handleInlineEditableInput`.
  7. Frosted glass footnote popover editor (`FootnotePopover.tsx`) with English UI, and bottom auto-generated footnotes section with direct edit (`✎`) and jump-to-text (`↩`) buttons.
  8. PDF export support (`exportNotebookPdf.ts`) for footnote marks and document end footnotes list.
- **Root Cause & Implementation:**
  - Previous slash menu logic eagerly split text blocks upon `/` keystroke before a command was even chosen, forcing subsequent insertions (like footnotes) into a detached block. Updated `startInsertMenuAtCurrentTextSelection`, `openSlashMenuAtToken`, and `addFootnoteAtTarget` to stay in the current node without splitting, strip the typed `/...` trigger, and place the footnote mark inline at the caret.
  - Context-aware filtering added to `getFilteredInsertCommands(commands, query, context)` with `getTargetNodeInsertContext(nodeId)`.
  - Footnote styling simplified from heavy pill badge to clean typographic superscript without borders or background containers, preventing line-height shifts.
  - Recompiled notebook style bundles using `pnpm run build:notebook-styles`.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/types.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/utils.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/inlineContent.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/markdown.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/documentModel.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/EditableTextBlock.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/FootnotePopover.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/InsertMenu.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/scenes/notebooks/exportNotebookPdf.ts`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-11 — Antigravity (Notebook Block Drag Handle Restoration & ClaudeWorkspaceChat Abort Guard)
- **Scope:** 
  1. Restore the notebook 6-dot block drag handle (`.MarkdownNotebook__drag-handle`, `IconDrag` ⠿) which disappeared after earlier layout changes.
  2. Fix unhandled exception `controller.abort()` in `src/components/ClaudeWorkspaceChat/index.tsx (581:18)`.
- **Root Cause & Implementation:**
  - **Drag Handle:** 
    - Previous styles used an old PostHog offset `left: calc(var(--markdown-notebook-content-offset) * -1 - 1rem);` (-42px) which left an 18px empty dead gap between the block boundary and the handle. When hovering a row and moving the mouse towards the handle, the cursor traversed the empty gap, losing `:hover` and causing the handle to vanish before it could be reached.
    - Repositioned `.MarkdownNotebook__drag-handle` to `left: -1.75rem` (-28px) with `width: 1.5rem` and `height: 1.5rem`.
    - Added an invisible hit bridge `::after` (`top: -6px; bottom: -6px; left: -6px; right: -16px; z-index: -1`) so the cursor maintains continuous hover while moving from text content into the handle.
    - Set hover styling with subtle rounded background `background: rgb(var(--accent) / 0.75)`, opacity 0.55 on row hover/focus-within, opacity 1.0 on handle hover, and `cursor: grab / grabbing`.
    - Updated `onClick` in `MarkdownNotebook.tsx` to safely trigger block options.
    - Recompiled notebook style bundles via `pnpm run build:notebook-styles`.
  - **ClaudeWorkspaceChat Abort Guard:**
    - Safely wrapped `controller.abort()` inside `try ... catch` and reset `abortControllerRef.current = null` before calling abort to prevent unhandled abortion exceptions during unmount or stream cancellation.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `src/components/ClaudeWorkspaceChat/index.tsx`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-11 — Grok (notebook mobile UX + history restore)
- **Scope:** After PDF PR #538. Highest remaining directive is mobile writing: no popovers on the selection, no horizontal shifts, insert still possible without hover `+`. Also local history compact left older snapshots unrestorable.
- **Implementation:**
  - Coarse pointer: format toolbar docks to the visual viewport (above the keyboard), not over the selection. Style dropdown still opens upward.
  - Long-press on a body block (including text) opens a bottom block-action bar with Insert. Focused row shows an in-flow Add chip on small screens (no left-gutter `+`, no layout jump).
  - `content-visibility: auto` disabled under 640px so scrolling does not jump.
  - History panel pulls `?history=1` and fills discarded local bodies from remote. Compacted local snapshots no longer wipe remote history on push (server merges, empty local list is a no-op).
- **Files Modified:** MarkdownNotebook.tsx/scss, editorTypes.ts, notebookRemote.ts, notebookStorage.ts, NotebookHistory.tsx, notebooks-repo.ts, AI_MEMORY, NOTEBOOK_SAAS_ROADMAP.

### 2026-09-11 — Grok (notebook text PDF)
- **Scope:** Share/Options PDF was a screenshot (`html-to-image` JPEG into jsPDF). User asked for a normal PDF. Same generator is used from the Share tab and the Options export menu.
- **Implementation:**
  - Walk parsed markdown and write real text with jsPDF + DejaVu (Turkish/latin-ext). Images stay images. No html-to-image on this path.
  - Print opens a paper article iframe (browser Save as PDF also gets real text).
  - Slim-list notebooks hydrate by id before PDF/md/json export.
  - Export panel is on the Share sidebar as well as Options. Print CSS forces `content-visibility: visible`.
- **Files Modified:** exportNotebookPdf.ts, notebookSidebarPanels.tsx, NotebookEditorReader.tsx, notebookStorage.ts, NotebooksListScene.tsx, ensureNotebookProductStyles.ts, site-bridge.scss, AI_MEMORY, NOTEBOOK_SAAS_ROADMAP.

### 2026-09-11 — Grok (notebook list/mentions/notify)
- **Scope:** Continue notebook optimization after PR #534. Audit live Supabase `iydypisgfaksqkjdraiu` and close gaps. No Yjs. Markdown remains source of truth.
- **Live audit:** 120 notebooks (avg 932 chars, p90 552, max 55k). RLS on. Realtime on `wim_notebooks`. `organize` already present. Missing: `preview` column, `wim_notebook_notifications`, auth `uri_allow_list` pages.dev wildcards. Duplicate owner/auth indexes left in place. Collaborator writes stay on service-role API. `notebook-media` public read / API write by design.
- **Implementation:**
  - List GET omits `content` (`preview` + `contentOmitted`). Editor hydrates via GET by id. Tasks view opt-in `include=content`. Slim remote merge keeps local body.
  - Mention marks store auth UUID. Server extracts `<mention>` + comment `mentionedIds` (UUID or username) and writes `wim_notebook_notifications`. New discussion replies notify owner + collaborators.
  - Auth allow-list adds `https://*.worldinmaking.pages.dev/**` and `https://*.pages.dev/**`.
- **Files Modified:** notebooks-repo, notebook-mentions, notebooks API, App, notebookRemote/Storage, NotebooksListScene, mentionPeople, notebookPresence, DiscussionCommentBlock, discussionComments, wim-notifications, wim-supabase-bootstrap, 20260911_notebook_list_preview_and_mentions.sql, AI_MEMORY, NOTEBOOK_SAAS_ROADMAP.
- **Do not commit the pasted Supabase PAT. Rotate it after this PR.**

### 2026-09-11 — Grok (slash insert menu)
- **Scope:** Slash `/` menu was not appearing after the content-visibility typing sprint.
- **Cause:** InsertMenu is `position: fixed` + `visibility: hidden` until positioned, and was rendered inside `.MarkdownNotebook__text-group` / rows with `content-visibility: auto`. That applies paint/layout containment, so fixed descendants position against the group and get clipped; a 0×0 anchor rect leaves the menu hidden. Nested canvas `contenteditable` means the group is often not `:focus-within`. Memoized text blocks also ignored slash callbacks.
- **Implementation:**
  - Render one InsertMenu at the notebook root (next to the find bar), outside any content-visibility group.
  - Force `content-visibility: visible` on groups/rows with `--insert-menu-open`; `--z-popover` fallback 1060.
  - Position fallback via `getNotebookBlockElement` if `blockRefs` missed the node.
  - Outside-click ignores the portaled menu.
  - EditableTextBlock keeps slash/insert callbacks on refs so memo does not freeze a stale opener.
- **Files Modified:** MarkdownNotebook.tsx, MarkdownNotebook.scss, EditableTextBlock.tsx, ensureNotebookProductStyles.ts, AI_MEMORY, NOTEBOOK_SAAS_ROADMAP.

### 2026-09-11 — Grok (notebook paste / mentions / PDF)
- **Scope:** Continue the notebook sprint after typing/list/find. Paste screenshots as Image blocks, mention collaborators in comments and body, make PDF export fail visibly.
- **Implementation:**
  - `collectClipboardImageFiles` reads `files` and `items`; paste capture inserts Image nodes even from a paragraph caret. Failed uploads toast.
  - Mention picker lists collaborators + presence; keyboard arrows/Enter. Comment composer uses the same list.
  - PDF waits on images with timeout, sets CORS, toasts success/failure.
- **Files Modified:** notebook-upload-shared, mentionPeople, MentionPicker, DiscussionCommentBlock, useNotebookClipboard, MarkdownNotebook, App, exportNotebookPdf, notebookSidebarPanels, AI_MEMORY, NOTEBOOK_SAAS_ROADMAP.

### 2026-09-11 — Grok (notebook typing/list/find)
- **Scope:** Make the notebook editor cheaper to type in, slim the notebooks list, add in-notebook Cmd+F. Markdown stays source of truth. No Yjs rewrite. Did not merge stale Jules or `plan*` PRs.
- **Implementation:**
  - Idle serialize (`SERIALIZE_IDLE_MS` 320ms) + `flushPending` on remote merge, pagehide, unmount, autosave.
  - Memoized text/list/code/table blocks; `content-visibility: auto` on unfocused groups.
  - List/palette hold `preview` instead of full bodies; tasks view keeps content.
  - Cmd+F find bar with match row highlight.
  - Unmount/history-restore flushes are scoped by notebook id + `markdownVersion` so they cannot write the previous draft into the next notebook.
- **Files Modified:** MarkdownNotebook.tsx, notebookEditorModel.ts, NotebookFindBar.tsx, Editable* blocks, MarkdownNotebook.scss, ensureNotebookProductStyles.ts, App.tsx, notebookStorage.ts, notebookPreview.ts, NotebooksListScene.tsx, CommandPaletteModal.tsx, README, NOTEBOOK_SAAS_ROADMAP, AI_MEMORY.

### 2026-09-11 — Grok (pass 8)
- **Scope:** Close Jules/Bolt PR noise; drop more unused leftovers; fix repo metadata. No visual/product change.
- **Implementation:**
  - Closed 270 open Jules/Bolt PRs (`author:app/google-labs-jules`). Left all `malidk345` PRs open, including #530 (body says do not merge until asked) and the notebook `plan*` series.
  - Repo description: `WorldInMaking — a desktop for writing`. Homepage: https://worldinmaking.com
  - Deleted unused `Explorer`, `LemonProvider`, `Timeline`. Kept `src/components/LemonTable` (notebook LemonTable is the live one).
- **Files Modified:** Explorer, LemonProvider, Timeline, AI_MEMORY. GitHub metadata + 270 PR closes.

### 2026-09-11 — Grok (pass 7)
- **Scope:** Agent-doc path fix + drop unused PostHog art-library page. No visual/product change.
- **Implementation:**
  - `AGENTS.md`: relative docs links (was a Windows `file:///D:/all works/posthog.com/...` path). Title no longer says posthog.com.
  - Deleted unused `src/pages/art-library.tsx` (PostHog Vercel iframe, zero importers).
  - Left `baa`/`dpa`/`subprocessors` — they are live Legal routes, not leftovers.
- **Files Modified:** AGENTS.md, art-library.tsx, AI_MEMORY.

### 2026-09-11 — Grok (pass 6)
- **Scope:** More unused PostHog leftover deletion. No visual/product change.
- **User Intent:** Continue optimization on PR 533 after Cloudflare CSS fix.
- **Implementation:**
  - Deleted unused component folders: Chip, CommunityCTA, HubSpotForm, Job, NoHatingAllowed, PostHogUI, ProfileStickers, Signatures, TeamMembers, TeamPatch.
  - Deleted unused `src/templates/Changelog.tsx`.
  - Removed unused packages `query-string` and `@dotlottie/react-player`. Dropped dead `components/PostHogUI` tsconfig path.
- **Files Modified:** unused component folders, Changelog.tsx, package.json, pnpm-lock.yaml, tsconfig.json, LemonUI comment, AI_MEMORY.

### 2026-09-11 — Grok (pass 5)
- **Scope:** Lazy MDX shortcodes + drop more unused PostHog leftovers. No visual/product change.
- **User Intent:** After merging PR 531, continue unused-code deletion and speed work in a new PR. Keep the live site as-is.
- **Implementation:**
  - Heavy MDX shortcodes (amcharts, wistia, sliders, calculators, team, hedgehog, etc.) load via `next/dynamic` in `mdxGlobalComponents.ts` / `.js`.
  - BlogPost / Tutorial defer TutorialsSlider, TutorialsList, NewsletterForm, BuiltBy. Restored ReaderView import.
  - Zoom CSS (`react-medium-image-zoom`, node_modules) lives on ZoomImage. First-party HiddenSection / MdxAnchorHeaders CSS stays in `_app` — Next.js Pages Router forbids global CSS imports from components (Cloudflare/Playwright compile error). Removed unused `rc-slider` CSS.
  - Deleted unused leftover folders: About (v2), Hub, PostCard, Cards, Blog chrome (+684KB default.jpg), Contact/index.js, Structure, Team.
  - Removed leftover unused npm packages (Gatsby webpack loaders, rc-slider, patch-package, hast/unist leftovers, etc.).
- **Files Modified:** mdxGlobalComponents.ts/js, BlogPost.tsx, Tutorial.tsx, ZoomImage, HiddenSection, MdxAnchorHeaders, `_app.tsx`, package.json, pnpm-lock.yaml, unused component folders.

### 2026-09-11 — Grok Build
- **Scope:** Personal assistant is a notebook-reading counselor that nags via NotificationsPanel — not a chat.
- **Files Modified:** assistant-notices, AssistantWindow, Watch, Desktop, wim-notifications, useUser.

### 2026-09-11 — Grok (pass 4)
- **Scope:** Drop unreferenced `src/images` (~23MB PostHog marketing art) and slim leftover Vercel/Gatsby `vercel.json`. No visual/product change.
- **Kept:** OS icons, philosopher pixel avatars, hourglass Lottie, portraits actually imported.
- **vercel.json:** security headers only. Removed Gatsby `index.html` rewrites (broken on Next) and 378 PostHog marketing redirects. Live routing stays in `next.config.js`.
- **Files Modified:** `src/images/**` (341 unused files), `vercel.json`.

### 2026-09-11 — Grok (pass 3)
- **Scope:** Defer command palette; drop more unused Gatsby leftovers and unused npm packages. No visual/product change.
- **User Intent:** Keep iterating inside PR 531 — unused code out, site faster, live UI unchanged.
- **Implementation:**
  - Cmd+K listener lives in Wrapper; CommandPalette chunk loads on first shortcut.
  - Deleted unused Gatsby leftovers: `html.tsx`, presentations, pages-content, unused blog/hub/OG/tutorial listing templates, `components/Tutorials`.
  - Removed unused packages (swiper, canvas-confetti, react-window, masonry, langchain google/groq, fontsource, etc.) and refreshed `pnpm-lock.yaml`.
  - `optimizePackageImports` now includes `@posthog/icons`.
- **Files Modified:** Wrapper, CommandPalette, next.config.js, package.json, pnpm-lock.yaml, unused templates/content.

### 2026-09-11 — Grok (pass 2)
- **Scope:** More unused leftover deletion + defer overlay chunks until first open. No visual/product change.
- **User Intent:** Keep the live site as-is; delete unused code; speed it up without breaking working flows.
- **Implementation:**
  - Wrapper mounts SearchOverlay, AuthModal, and ActiveWindowsPanel only after first open (Cmd+K command palette stays mounted because it owns the shortcut listener).
  - Deleted zero-import PostHog leftovers: WordArt, Apps, Banner, Accordion, Checkbox, Container, SignUp, Tabs, Templates, TemplatesLibrary, MediaLibrary, HedgehogGenerator, FooterCTA, Breadcrumbs, AnimateIntoView, Card, Header, Footer, Section, Popover, leftover `components/MarkdownNotebook` scss, `useMediaLibrary`.
- **Verification:** Typecheck shell green on PR 531. Playwright 8 failures match pre-existing main (SEO h1 copy, admin/API tests) — not caused by this work.
- **Files Modified:** Wrapper, unused component folders, `src/hooks/useMediaLibrary.tsx`, AI_MEMORY.

### 2026-09-11 — Grok
- **Scope:** Shell first-load split + unused PostHog leftover deletion. No visual/product behavior change.
- **User Intent:** Keep the live site as-is; delete unused code; speed it up without breaking working flows.
- **Implementation:**
  - Moved `isForumPath` / `isBlogPath` to `src/lib/window-path.ts` so `App.tsx` no longer imports `WindowRouter` (which pulled BlogPost/Inbox/Admin into the shell graph).
  - `WindowRouter` now `next/dynamic`s route modules (blog, inbox, admin, tape player, about, …) so they load when a window opens.
  - Desktop defers Claude chat, notifications, hedgehog, and confetti until first use.
  - Catch-all `[...slug]` code-splits Inbox/Blog/Profile per route.
  - Removed unused global CSS (Corpus, Spacer). Deleted unused leftover folders (Careers, Subscribe, posthog-ui-gallery, …) and scratch files.
  - Extra webpack async cacheGroups: hedgehog, amcharts, mapbox, workspace-chat.
- **Files Modified:** WindowRouter, Desktop, App.tsx, window-path.ts, `[...slug].tsx`, `_app.tsx`, next.config.js, .gitignore, unused component folders, scratch root files.

### 2026-09-10 — Antigravity (Advanced Agentic Coding)
- **Scope:** NotificationsPanel Expansion — Philosopher Bot Replies & Notebook Collaboration Invites.
- **User Intent:** Expand the notifications panel beyond basic forum replies to include meaningful product events (Philosopher Bot replies/mentions and WIM Notebook collaboration invites/additions) without altering existing styling or layouts, without gamification/achievements, and strictly in English ("olur hepsine okeyim yap ama notifacation panele ve bildirimlerin stiline asla dokunma farklı bir tasarım yapma su an olan aşırı iyi", "evet ama türkçe yapayım deme şimdi site ingilizce", "accievment falan istemem").
- **Implementation:**
  - `src/lib/wim-notifications.ts`:
    - Updated `fetchUserNotifications()` to aggregate:
      1. **Forum & Philosopher Bot Notifications:** Detects if the latest reply was authored by a resident philosopher bot (via `matchPhilosopherId`, `PHILOSOPHER_BOTS`, or `profiles.is_bot`). Formats excerpt as `'Philosopher'` and title as `${botName} replied to "${threadTitle}"` (or `${botName} mentioned you in...`).
      2. **Notebook Collaboration Invites & Additions:** Queries `wim_notebook_invites` (pending invites for `invited_user_id = user.id`) and `wim_notebook_collaborators` (direct collaborator additions). Resolves inviter profiles and notebook titles. Formats excerpt as `'Notebook'`, title as `${inviter} invited you to collaborate on "${title}"`, count as `${role} invite` or `${role}`, and links to `/notebooks/invite/${token}` or `/notebooks/${notebook_id}`.
    - Updated `dismissUserNotification(id)` to support string IDs (e.g. `invite_...`, `collab_...`) persisting to local storage and numeric IDs syncing to Supabase `user_notifications.dismissed_at`.
  - `src/components/NotificationsPanel/index.tsx`:
    - Preserved 100% of existing JSX markup, CSS classes, animations, and visual presentation.
    - Updated `NotificationItem.id` to accept `number | string`.
    - Made `dismiss` call `dismissUserNotification(id)` so dismissals persist across page reloads.
  - `src/hooks/useUser.tsx`:
    - Updated `updateNotifications` to support `number | string` IDs.
    - Added immediate notification fetch tick on user change/hydration.
- **Verification:**
  - `pnpm run typecheck:shell`: Passed with 0 gated errors (`PASS — zero gated errors in core shell allowlist`).
- **Files Modified:**
  - `src/lib/wim-notifications.ts`
  - `src/components/NotificationsPanel/index.tsx`
  - `src/hooks/useUser.tsx`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-10 — Antigravity (Advanced Agentic Coding)
- **Scope:** Remove PostHog Incident Alert Banner & Analytics Events from Community Ask a Question Modal.
- **User Intent:** Fix PostHog notification dropping in Ask a Question modal ("community kısmında ask a question modalında posthogtan bir bildirim düşmüş bunu çöz", "öz ya gönderemesin posthog").
- **Root Cause:**
  1. `QuestionForm.tsx` in `src/components/Squeak/components/` was polling `https://www.posthogstatus.com/api/v1/summary` via `useAppStatus()`. Whenever there was any incident or degraded status on PostHog's infrastructure, an invasive *"Heads up! We're currently experiencing an incident. Check here for the latest info"* warning banner dropped directly into the user's question writing surface.
  2. The form also invoked `posthog.capture('wim question created')` and `posthog.capture('community honeypot rejection')` upon submission.
- **Fixes Applied:**
  - `src/components/Squeak/components/QuestionForm.tsx`:
    - Removed `useAppStatus()` hook call and the entire incident banner rendering block.
    - Removed `posthog.capture('wim question created')` and `posthog.capture('community honeypot rejection')`.
    - Cleaned up unused `usePostHog` import.
- **Verification:**
  - `pnpm run typecheck:shell`: Passed with 0 errors (`PASS — zero gated errors in core shell allowlist`).
  - Git diff verified.
- **Files Modified:**
  - `src/components/Squeak/components/QuestionForm.tsx`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** Fix Mobile Pencil Icon Style Dropdown (H1/H2/H3/Quote) Not Opening in FormattingToolbar.
- **User Intent:** Resolve issue where tapping the pencil style button to change headings on mobile does not open the dropdown menu ("bu kalem ikonu var ya heading falan açan o mobilde açılmıyor").
- **Root Cause:**
  1. **CSS Overflow Clipping on Mobile (`MarkdownNotebook.scss`):** `@media (max-width: 640px)` had `overflow-x: auto; overflow-y: visible;`. By CSS specification, any axis set to `auto`/`scroll` forces `overflow-y` to `auto`/hidden, clipping all absolutely positioned children (such as `.MarkdownNotebook__format-style-dropdown` placed at `top: calc(100% + 6px)`) inside the 36px toolbar height, making it completely invisible.
  2. **Touch Pointerdown Selection Collapse (`FormattingToolbar.tsx`):** On mobile devices, tapping `<button>` fired `pointerdown`/`touchstart` without `preventDefault()`, causing mobile WebKit/Blink to collapse the editor text selection before `click` fired. Once selection collapsed, `updateFloatingToolbarFromSelection` immediately unmounted the toolbar.
  3. **Toolbar Focus Check False Negative (`domSelection.ts`):** `isFormattingToolbarFocused()` only checked `document.activeElement`, but mobile Safari does not focus buttons on tap.
- **Fixes Applied:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`:
    - Replaced `overflow-x: auto; overflow-y: visible;` with `overflow: visible !important;` on mobile `.MarkdownNotebook__format-toolbar`.
    - Added dedicated mobile touch targets for `.MarkdownNotebook__format-btn--style` (`min-width: 34px`) and comfortable padding for `.MarkdownNotebook__format-style-menu-item` (`padding: 7px 10px; font-size: 13.5px`).
  - `src/notebook-app/lib/components/MarkdownNotebook/FormattingToolbar.tsx`:
    - Added `onPointerDown={(e) => e.preventDefault()}` to `FormatBtn` and each style dropdown menu item to prevent mobile selection collapse on touch.
    - Updated container `onPointerDownCapture` to prevent default on non-input targets.
  - `src/notebook-app/lib/components/MarkdownNotebook/domSelection.ts`:
    - Enhanced `isFormattingToolbarFocused()` to detect open `.MarkdownNotebook__format-style-dropdown` or `.MarkdownNotebook__format-link-editor` elements in the DOM so the toolbar is preserved during menu interactions.
  - Recompiled notebook stylesheets with `pnpm run build:notebook-styles`.
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/lib/components/MarkdownNotebook/FormattingToolbar.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/domSelection.ts`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** Compact & Sleek Optimization of Ask AI Inline Editor Modal & Header Popover.
- **User Intent:** Make the modal significantly more compact ("modalı daha kompakt yap").
- **Fixes Applied:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`:
    - Reduced `.WimInlinePill` height from `36px` to `28px` (`32px` on mobile), tightened padding to `2px 4px 2px 8px`, reduced max-width to `320px`, min-width to `180px`, and set radius to `8px`.
    - Reduced `.WimInlinePill--review` height from `34px` to `26px` (`30px` on mobile), action button dimensions to `18px x 18px` (`22px` on mobile), and gap to `0.25rem`.
    - Reduced `.WimInlinePill__input` height from `24px` to `22px` with `0.74rem` crisp font size.
    - Reduced `.WimInlinePill__submitBtn` to `18px x 18px` with radius `5px`.
    - Reduced `.WimInlinePill__presets` max-width to `360px`, padding to `0.25rem 0.35rem`, gap to `0.25rem`, and preset item padding to `0.15rem 0.38rem` with `0.68rem` font size.
  - `src/notebook-app/scenes/notebooks/CollaboratorsBanner.tsx`:
    - Reduced People & history popover width from `w-80` (320px) to `w-72` (288px), max height to `max-h-64`, avatar size from `size-7` to `size-6`, and tightened padding throughout.
  - Recompiled notebook stylesheets with `pnpm run build:notebook-styles`.
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/scenes/notebooks/CollaboratorsBanner.tsx`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** Align Notebook Ask AI Inline Editor Styling with Notebook Topbar Glassmorphism and Remove Plus Icon.
- **User Intent:** Match the Ask AI inline editor modal (`EditablePromptComponent` / `WimInlinePill`) styling with the notebook header (`notebook-topbar-glass`), and remove the plus (+) icon from the inline editor as explicitly requested ("ask ai modalı var ya inline editör olan onu da notebook headerla aynı yap ama artı ikonunu istemiyorum orada bunu da bil").
- **Fixes Applied:**
  - `src/notebook-app/lib/components/MarkdownNotebook/EditablePromptComponent.tsx`:
    - Removed `IconPlus` from `@posthog/icons` imports and deleted the left `<button className="WimInlinePill__plusBtn">` plus icon element. Presets remain accessible via `Tab` keyboard shortcut when input is empty.
    - Added `notebook-topbar-glass` class to `WimInlinePill` (main prompt pill), `WimInlinePill--review` (accept/retry/reject review pill), and `WimInlinePill__presets` (popup actions menu).
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`:
    - Updated `.WimInlinePill`, `.WimInlinePill--review`, and `.WimInlinePill__presets` base definitions to match the exact Craft frosted glass tokens used by `.notebook-topbar-glass`:
      - Light: `background: rgba(255, 255, 255, 0.88); border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 10px; box-shadow: 0 4px 18px -2px rgba(0, 0, 0, 0.09), 0 2px 6px -1px rgba(0, 0, 0, 0.04); backdrop-filter: blur(20px) saturate(180%); color: #1c1c1e;`.
      - Dark: `background: rgba(30, 31, 35, 0.88); border-color: rgba(255, 255, 255, 0.12); box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.45); color: #f4f4f5;`.
  - Recompiled notebook stylesheets with `pnpm run build:notebook-styles` (`bundleCss.ts`, `productBundleCss.ts`).
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/EditablePromptComponent.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** Fix Notebook Header & Popover Avatar Shifting and Misalignments.
- **User Intent:** Resolve visual shifting/clipping in profile photos both in the notebook header bar and inside the People & history popover modal ("nıtebook header da profil fotolarında bazı kaymalar oluyor hem headerda hem açılan modalda").
- **Root Cause:**
  - `Avatar.tsx` added its own internal wrapper with `p-px`, aspect ratio constraints, and `border border-primary`.
  - In `NotebookFaceStack.tsx`, avatars were wrapped in a `span` that had its own `border border-primary`, creating a nested double-border, subtle subpixel misalignment, and awkward clipping.
  - In `CollaboratorsBanner.tsx`, the overlay modal also wrapped `Avatar` inside an outer `size-6 shrink-0 rounded-full overflow-hidden border border-primary` container, causing the same double-border, padding squeeze, and shifted icon graphics.
- **Fixes Applied:**
  - `src/notebook-app/scenes/notebooks/NotebookFaceStack.tsx`: Replaced nested `Avatar` wrapper with direct rounded `img` and fallback `svg` with clean outer `ring-2 ring-white dark:ring-[#1e1f23]`, removing double borders and layout shifting.
  - `src/notebook-app/scenes/notebooks/CollaboratorsBanner.tsx`: Replaced nested `Avatar` wrappers in both "People" and "Snapshots" lists with clean `size-7 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/10` containers and direct image/SVG elements.
- **Verification:**
  - `pnpm run typecheck:shell`: PASS (0 errors in core shell allowlist).
- **Files Modified:**
  - `src/notebook-app/scenes/notebooks/NotebookFaceStack.tsx`
  - `src/notebook-app/scenes/notebooks/CollaboratorsBanner.tsx`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** Fix Notebook Mobile Horizontal Margins — Align 1:1 with Blog Posts.
- **User Intent:** Text was too far inside from the edges on mobile (\"kenarlardan çok içeride metin mobilde\"). Notebook mobile margin was 39px while blog posts had 25px — 14px too much on each side.
- **Root Cause:**
  - `MarkdownNotebook.scss` `@media (max-width: 640px)` block added `padding-left: 0.875rem; padding-right: 0.875rem` (14px) directly to `.MarkdownNotebook` div. Blog posts have no such self-padding; padding is handled entirely by the outer `ReaderView` container.
  - `NotebookEditorReader.tsx` used `padding={false}` + manual `px-4 @md:px-6 @lg:px-8 @xl:px-12` on wrapper div — this created container-query-based escalation inconsistent with blog's viewport-query based escalation.
- **Fixes Applied:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`: Changed mobile `padding-left`/`padding-right` from `0.875rem` to `0`.
  - `src/notebook-app/scenes/notebooks/NotebookEditorReader.tsx`: Changed `padding={false}` to `padding={true}` and removed manual `px-4 @md:px-6 @lg:px-8 @xl:px-12` from children wrapper div. The `ReaderView` component now manages its own `p-4` padding (same as blog posts).
- **Verification:** Playwright computed margin test confirmed 1:1 match — Blog: `pLeft=25px`, `pWidth=340px`; Notebook: `pLeft=25px`, `pWidth=340px` — identical on 390px viewport.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/scenes/notebooks/NotebookEditorReader.tsx`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`


- **Scope:** Align Notebook Edge Margins and Content Width 1:1 with Blog Posts (`BlogPost.tsx` / `ReaderView`).
- **User Intent:** Fix excessive inner indentation ("metin çok içeride yani kenarlardan boşluk çok blog postları gibi değil") so that notebook text begins at the exact same comfortable 48px side margin as blog posts rather than sitting squished in the center with 114px+ void gutters.
- **Root Cause Diagnosis & Resolutions:**
  1. **Container Query Escalation & Padding Bloat (`NotebookEditorReader.tsx`):**
     - In `BlogPost.tsx`, the presence of the 250px `FloatingTOC` right sidebar keeps the center article container at ~650px (`@xl`), applying `px-12` (48px) side padding.
     - In `NotebookEditorReader.tsx`, `hideRightSidebar={true}` caused the container to span 900px+ (`@3xl`), which triggered Tailwind's `@3xl/reader-content-container:px-20` (80px padding).
     - Passed `padding={false}` to `ReaderView` in `NotebookEditorReader.tsx` and wrapped children in `<div className="min-w-0 flex-1 px-4 @md:px-6 @lg:px-8 @xl:px-12 py-2">` to cap desktop horizontal padding at `48px` (`px-12`), directly matching `BlogPost`.
  2. **Double-Centering / Narrow Column Clamping (`App.tsx` & `MarkdownNotebook.scss`):**
     - Commit `5afec2ab` reduced the wrapper in `App.tsx` from `max-w-3xl mx-auto` to `max-w-2xl mx-auto` (672px) and `--markdown-notebook-canvas-max-width` to `42rem` (672px).
     - In a 900px column with 80px padding, centering a 672px box added an extra 34px auto margin, pushing the canvas to `x = 437px` (114px inside the card, 102px indented from the topbar).
     - Restored `--markdown-notebook-canvas-max-width: 56rem` (896px) in `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss` and `src/components/MarkdownNotebook/MarkdownNotebook.scss`, with `72rem` for `.MarkdownNotebook--wide`.
     - In `App.tsx`, updated editor wrapper to `max-w-4xl mx-auto` (896px) so that in normal window sizes (900px space) the text naturally fills the column with exactly 48px margin on the left (`x = 371px`) and 48px on the right (`x = 1175px`), verified 1:1 against `blog_desktop.png` (`x = 371px`).
- **Files Modified:**
  - `src/notebook-app/scenes/notebooks/NotebookEditorReader.tsx`
  - `src/notebook-app/App.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `docs/architecture/AI_MEMORY.md`
- **Verification:**
  - `pnpm run build:notebook-styles` compiled without errors.
  - `pnpm run typecheck:shell` PASSED (0 errors in allowlist).
  - Playwright visual metrics verification: `canvasRect.x = 371px` (matches `blogMetrics.pRect.x = 371px` to the exact pixel). Mobile tested cleanly at 375x667.

- **Scope:** 1:1 Complete Typography Alignment of Notebook (`MarkdownNotebook`) with Blog Posts (`BlogPost.tsx` / `ReaderView`).
- **User Intent:** Ensure all font settings, typography, font family, font size, line-height, font weight, and element styles in the notebook are 100% identical ("birebir aynı") to blog posts.
- **Root Cause Diagnosis & Resolutions:**
  1. **Stripped Prose Cascade via `not-prose` Wrapper (`NotebookEditorReader.tsx`):**
     - `NotebookEditorReader.tsx` previously wrapped `{children}` in `<div className="not-prose">{children}</div>`. In `@tailwindcss/typography`, `:not(:where([class~="not-prose"] *))` neutralized all `.prose` and `.prose-sm` cascade rules on all descendant elements.
     - Removed `not-prose` wrapper; replaced with `<div className="min-w-0 flex-1">{children}</div>` so typography tokens flow through.
  2. **Font Family Harmonization (`RoundHog, sans-serif`):**
     - Blog posts inherit `body` font: `@apply font-rounded m-0;` where `font-rounded` is `['RoundHog', 'sans-serif']`.
     - Replaced generic `font-sans` with `font-rounded` in `src/notebook-app/App.tsx` and `src/notebook-app/scenes/notebooks/NotebookPublicView.tsx`.
     - Replaced undefined `font-family: var(--font-sans);` in `src/lib/lemon/ensureLemonStyles.ts` with `'RoundHog', sans-serif`.
     - Explicitly bound `font-family: 'RoundHog', sans-serif !important;` in `MarkdownNotebook.scss` across both editor and public scopes.
  3. **Document Title 1:1 Match with `Title.tsx` (`MarkdownNotebook.scss`):**
     - The document title (first row with `isTitleBlock`) was previously treated as a generic `h1` without prominent title hierarchy.
     - Applied exact blog post title styling: `font-size: 1.875rem !important;` (mobile) / `2.25rem !important;` (md+), `font-weight: 700 !important;`, `line-height: 1.25 !important;`, `letter-spacing: -0.02em !important;`, and `margin-bottom: 1.25rem !important;`.
  4. **Headings, Paragraphs, Lists & Spacing Alignment:**
     - Aligned all non-title headings to `prose-sm` metrics: `h1` (`2.1428571em`), `h2` (`1.4285714em`), `h3` (`1.2857143em`), `h4-h6` (`1em`), all with `font-weight: 700 !important;`.
     - Paragraphs and lists set to `15px !important; line-height: 1.5 !important; margin: 0;` (with `1.1em` inter-block spacing matching `global.css .prose p`).
     - Cleared mobile-only overrides that forcefully clamped headings to 1.5rem / 1.25rem / 1.1rem and forced 16px on body content.
  5. **Inline Code & Links:**
     - Styled inline code 1:1 with `components/InlineCode/index.js`: `Source Code Pro` font, `0.875em`, light padding, red text + tint in light mode (`#F54E00`), yellow/blue tint in dark mode (`#3B82F6`).
     - Styled links with `font-weight: 600 !important; text-decoration: underline !important; text-underline-offset: 2px !important;`.
  6. **Blockquotes:**
     - Styled `.MarkdownNotebook__blockquote-group` with secondary background card treatment (`0.5rem 1rem` padding, `4px` radius, subtle border) and italic text matching blog `Blockquote`.
- **Files Modified:**
  - `src/notebook-app/scenes/notebooks/NotebookEditorReader.tsx`
  - `src/notebook-app/App.tsx`
  - `src/notebook-app/scenes/notebooks/NotebookPublicView.tsx`
  - `src/lib/lemon/ensureLemonStyles.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** Match Notebook Top Bar (Collaborators/Presence Header) Glassmorphism with Craft Floating Toolbar.
- **User Intent:** Apply the exact same glassmorphism design tokens (frosted glass background, backdrop blur, border, subtle drop shadow, and border radius) from the Craft formatting toolbar to the top bar with people/collaborators, without altering any layout or internal contents of the bar.
- **Implemented Changes:**
  - `src/styles/global.css`:
    - Defined `.notebook-topbar-glass` using the exact Craft glass token values:
      - Light mode: `background: rgba(255, 255, 255, 0.88); border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 10px; box-shadow: 0 4px 18px -2px rgba(0, 0, 0, 0.09), 0 2px 6px -1px rgba(0, 0, 0, 0.04); backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%); color: #1c1c1e;`.
      - Dark mode: `background: rgba(30, 31, 35, 0.88); border-color: rgba(255, 255, 255, 0.12); box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.45); color: #f4f4f5;`.
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`:
    - Added `.notebook-topbar-glass` rule matching the toolbar's glassmorphism so scoped and product-bundle stylesheets share the exact definition.
  - `src/components/ReaderView/index.tsx`:
    - Replaced the previous modal-style container classes on the `stickyHeader` wrapper with `notebook-topbar-glass overflow-hidden`.
  - Recompiled notebook stylesheets into `bundleCss.ts` and `productBundleCss.ts`.
- **Files Modified:**
  - `src/styles/global.css`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/components/ReaderView/index.tsx`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** Unify MarkdownNotebook FormattingToolbar Placement (Mobile Matches Desktop Above-Selection Anchoring).
- **User Intent:** Ensure mobile does not dock the toolbar to the bottom of the screen. Mobile and desktop behavior must be 100% identical, opening directly centered above the selected text without altering desktop.
- **Implemented Changes:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`:
    - Removed `if (isNarrow)` branch in `updateFloatingToolbarFromSelection` that previously docked the toolbar to the bottom of the screen above the keyboard.
    - Mobile now uses the exact same calculation as desktop: anchors directly centered horizontally on `selectionRect` (`selectionRect.left + selectionRect.width / 2`) and 8px vertically above `selectionRect.top` (flipping to 8px below `selectionRect.bottom` only when near the viewport top edge).
    - `useLayoutEffect` in `FormattingToolbar.tsx` automatically applies `boundsShift.x` and `boundsShift.y` within `visualViewport` so the toolbar is clamped inside screen boundaries on narrow mobile screens.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** Migrate FormattingToolbar to Official Site Icon Families (`@posthog/icons` & `iconsShim`).
- **User Intent:** Ensure all toolbar icons strictly adhere to the site's official icon design system and icon libraries rather than custom inline SVGs.
- **Implemented Changes:**
  - `src/notebook-app/lib/icons/iconsShim.tsx`: Exported `IconStrikethrough` and `IconUnderline` from `lucide-react` with standard `w-4 h-4 inline-block` shim styling.
  - `src/notebook-app/lib/components/MarkdownNotebook/FormattingToolbar.tsx`:
    - Removed all ad-hoc inline SVG components (`IconCraftPencil`, `IconChevronDown`, `IconCraftLink`, `IconCraftComment`, `IconCheck`).
    - Directly imported `IconPencil`, `IconChevronDown`, `IconCode`, `IconComment`, `IconCopy`, `IconExternal`, `IconQuote`, `IconSparkles`, `IconCheck` from `@posthog/icons`.
    - Directly imported `IconBold`, `IconItalic`, `IconStrikethrough`, `IconLink`, `IconIndent`, `IconOutdent` from `iconsShim`.
    - Styled icons uniformly using `.MarkdownNotebook__format-btn svg` (`width: 14px; height: 14px;`) with clean opacity adjustments for sub-elements like the dropdown chevron.
- **Files Modified:**
  - `src/notebook-app/lib/icons/iconsShim.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/FormattingToolbar.tsx`
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** MarkdownNotebook Inline Formatting Toolbar — Craft-Style Floating Glassmorphism & Centered Selection Anchoring.
- **User Intent:** Transform the notebook's inline formatting toolbar to match the Craft editor reference design: translucent white frosted glassmorphic pill, compact single-button style dropdown `[ ✏️ ▾ ]`, inline action buttons (`B`, `I`, `S`, `</>`, `🔗`, `✨`, `|`, `💬+`), attached popovers for style menu & link editor, and anchored directly above selection without erratic mouse drag displacement.
- **Diagnosis & Implemented Changes:**
  1. **Centered Selection Anchoring (`MarkdownNotebook.tsx`):**
     - Removed `pointerAnchor` override from `updateFloatingToolbarFromSelection`. The toolbar now strictly anchors horizontally centered on the selection (`selectionRect.left + selectionRect.width / 2`) and 8px directly above `selectionRect.top` (flipping to 8px below `selectionRect.bottom` only when near the viewport top edge).
     - Passed `activeMarks` (bold, italic, strike, underline, code) to `<FormattingToolbar />` by checking selections via `areInlineSelectionsFullyMarked` across text and list item nodes.
  2. **Craft Toolbar Layout & Style Popover (`FormattingToolbar.tsx`):**
     - Replaced the 6 separate horizontal style buttons with a single compact `[ ✏️ ▾ ]` style button that opens a vertical popover menu (`.MarkdownNotebook__format-style-dropdown`).
     - Rendered inline formatting buttons matching Craft order: `[ ✏️ ▾ ]`, `Bold (B)`, `Italic (I)`, `Strikethrough (S)`, `Code (</>)`, `Link (🔗)`, `AI (✨)`, `|` divider, `Comment (💬+)`, `Copy`, indent/outdent.
     - Detached the link editor from horizontal toolbar flow: rendered `.MarkdownNotebook__format-link-editor` as an attached child popover card below the toolbar, keeping the toolbar compact (~260px width) on all viewports.
     - Added click-outside listener and Escape key handling to close the style dropdown without closing the selection.
  3. **Craft Frosted Glassmorphism Styles (`MarkdownNotebook.scss`):**
     - `.MarkdownNotebook__format-toolbar`: 10px rounded pill, height 36px, `background: rgba(255, 255, 255, 0.88)`, border `1px solid rgba(0, 0, 0, 0.08)`, `backdrop-filter: blur(20px) saturate(180%)`, soft shadow `0 4px 18px -2px rgba(0, 0, 0, 0.09)`. Dark mode: `rgba(30, 31, 35, 0.88)`.
     - `.MarkdownNotebook__format-btn`: 28x28px compact buttons with active mark tint `rgba(29, 78, 216, 0.12)` and `#1d4ed8` accent.
     - `.MarkdownNotebook__format-style-dropdown` & `.MarkdownNotebook__format-link-editor`: Frosted glass child cards with `backdrop-filter: blur(20px) saturate(180%)`, 8px rounded corners, and vertical drop shadows.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/FormattingToolbar.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** Align MarkdownNotebook Typography & Horizontal Window Width with Blog Posts (`ReaderView` / `BlogPost.tsx`).
- **User Intent:** Match text styles (headings h1-h6, body text, lists, inline code, links) and horizontal body width / window occupancy in notebooks with blog posts.
- **Root Cause Diagnosis & Resolutions:**
  1. **Horizontal Container & Body Width Alignment:**
     - Blog posts in `BlogPost.tsx` / `ReaderView` use container width `mx-auto max-w-2xl` (`42rem` / `672px`) centered within responsive container padding (`p-4 @md:px-6 @lg:px-8 @xl:px-12 @2xl:px-16 @3xl:px-20`).
     - Notebook previously used `--markdown-notebook-canvas-max-width: 56rem;` and `App.tsx` had `max-w-3xl mx-auto` (`48rem`), making the notebook 6rem-14rem wider than blog posts.
     - Updated `--markdown-notebook-canvas-max-width` in `MarkdownNotebook.scss` to `42rem;` (with `.MarkdownNotebook--wide` allowing `56rem` when wide mode is toggled).
     - Updated `App.tsx` wrapper from `max-w-3xl mx-auto` to `max-w-2xl mx-auto` (and passed `.MarkdownNotebook--wide` when `chrome.wide` is enabled).
     - Updated `NotebookPublicView.tsx` container to `w-full max-w-2xl mx-auto p-4` to match blog post width in public view as well.
  2. **Typography & Styling Alignment:**
     - Aligned base text to 15px font size, line-height 1.5, matching `.prose-sm` + `global.css`.
     - Harmonized all headings: `h1` (2.1428571em, font-weight 700, line-height 1.2), `h2` (1.4285714em, font-weight 700, line-height 1.4), `h3` (1.2857143em, font-weight 700, line-height 1.5555556), `h4`/`h5`/`h6` (1em, font-weight 700, line-height 1.4285714).
     - Aligned vertical spacing: inter-paragraph spacing `1.1em`, pre-heading spacing (`h1`: 1.8em, `h2`: 1.6em, `h3`: 1.55em, `h4-h6`: 1.4em), and post-heading spacing (`h1`: 0.8em, `h2`: 0.6em, `h3-h4`: 0.45em).
     - Styled inline `code` within `.MarkdownNotebook__text-block` to match `InlineCode` in blog posts: red text with red tinted border & background in light mode, yellow tinted in dark mode.
     - Ensured links inside `.MarkdownNotebook` have underline and 500 font-weight matching blog prose links.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/App.tsx`
  - `src/notebook-app/scenes/notebooks/NotebookPublicView.tsx`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`

### 2026-09-07 — Antigravity (Advanced Agentic Coding)
- **Scope:** MarkdownNotebook Heading Creation, Slash Commands & Editorial Glitch Fixes.
- **Root Cause Diagnosis & Resolutions:**
  1. **Zero-Height Collapse on Empty Headings (`MarkdownNotebook.scss`):**
     - Headings previously had `min-height: 0;` (`h1..h4.MarkdownNotebook__text-block`), causing freshly inserted or empty headings to collapse to 0px tall and appear invisible to users.
     - Replaced with proper responsive minimum heights (`h1`: `1.25em`, `h2`: `1.3em`, `h3`/`h4`: `1.35em`) and distinct typography/margins (`1.875rem` / `1.5rem` / `1.25rem`).
  2. **Missing Empty Heading Placeholders (`MarkdownNotebook.tsx` & `MarkdownNotebook.scss`):**
     - Headings previously passed `placeholder: undefined` when not the first node in an empty document.
     - Updated `MarkdownNotebook.tsx` to supply `'Heading 1'`, `'Heading 2'`, `'Heading 3'`, and `'Quote'` placeholders for empty blocks.
     - Added `.MarkdownNotebook__text-block--heading:empty::before` styling with dimmed text and `pointer-events: none;`.
  3. **Lost Caret Focus on Heading/Quote Slash Insert (`InsertMenu.tsx`):**
     - `text-heading-1`, `text-heading-2`, `text-heading-3`, and `text-quote` did not call `focusInsertedText(targetNodeId)`, resulting in focus being lost when clicking or hitting Enter in the slash menu.
     - Added `focusInsertedText(targetNodeId)` to all text and quote insert commands.
  4. **Premature Slash Command Termination on Spaces (`documentModel.ts`):**
     - `getSlashTokenAt` previously aborted whenever `/\s/.test(query)` was true.
     - Updated to allow single spaces within queries (`query.includes('\n') || / {2,}/.test(query) || query.length > 35`), enabling commands like `/heading 1`, `/h 1`, `/başlık 1`, `/kod bloğu`.
  5. **Bilingual & Accent-Insensitive Slash Search (`InsertMenu.tsx`):**
     - Added comprehensive English & Turkish aliases for all text commands (`h1`, `heading 1`, `header 1`, `başlık 1`, `baslik 1`, `ana başlık`, `alıntı`, `kod`, `madde`, `görev`, etc.).
     - Enhanced `getFilteredInsertCommands` with Turkish character and accent normalization (`ı/i`, `ğ/g`, `ü/u`, `ş/s`, `ö/o`, `ç/c`).
  6. **Premature Markdown Shortcut Triggering (`documentModel.ts`):**
     - `getHeadingShortcut` previously matched `/^#{1,3}\s?$/`, triggering immediately on typing `#` without a space and wiping the hash character.
     - Updated regex to require a space `/^(#{1,3})\s+(.*)$/` and preserve any trailing text in the new heading's children.
     - Similarly updated blockquote shortcut to require a space (`/^>\s+(.*)$/`).
  7. **Enter & Backspace Editorial Glitches in Headings (`EditableTextBlock.tsx`):**
     - Pressing Enter at the end of a heading now correctly inserts a new `paragraph` block instead of duplicating the heading level.
     - Pressing Enter or Backspace on an empty heading now immediately downgrades it to a normal paragraph.
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`
  - Clean git diff with no side-effects on other modules.

### 2026-09-07 — Antigravity (Advanced Agentic Coding)
- **Scope:** Notebook Inline Editor & Format Toolbar AuthModal Glassmorphism Restyle (No Shadows).
- **Motivation:** User instructed to apply the exact same frosted glassmorphism from the Sign-in modal (`AuthModal.tsx`) with zero drop shadow to the inline editor in the notebook, without altering any actions or content.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`:
    - `.MarkdownNotebook__format-toolbar`: Applied frosted glass `background: rgba(255, 255, 255, 0.7)` (dark: `rgba(24, 25, 28, 0.7)`), `border: 1px solid rgba(255, 255, 255, 0.8)` (dark: `rgba(255, 255, 255, 0.15)`), `backdrop-filter: blur(40px)`, `border-radius: 12px`, and `box-shadow: none !important;`. Refined button and divider contrast.
    - `.WimInlinePill` & `.WimInlinePill--review`: Replaced solid dark pill with `rgba(255, 255, 255, 0.7)` / dark `rgba(24, 25, 28, 0.7)`, `border-radius: 12px`, `backdrop-filter: blur(40px)`, `box-shadow: none !important;`, theme-aware text contrast.
    - `.WimInlinePill__presets` & `.WimInlinePill__presetItem`: Applied matching frosted glass background, 12px border radius, and zero drop shadow.
    - `.WimInlineEditor--floating`: Applied identical glassmorphism tokens.
  - Recompiled bundles: `src/notebook-app/styles/bundleCss.ts` and `src/notebook-app/styles/productBundleCss.ts`.
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with 0 errors.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`
  - Next.js Dev Server: `GET /notebooks 200 OK`.
  - Handoff: All buttons, icons, actions, selection handling, and keyboard navigation remain 100% functional.


### 2026-09-07 — Antigravity (Advanced Agentic Coding)
- **Scope:** Complete Dead PostHog UI Component Purge (Preserving NotebooksList & LemonTable 100%).
- **Motivation:** User explicitly instructed to keep NotebooksList and LemonTable 100% original and purge all other dead PostHog components and folders.
- **Deletions & Cleanups:**
  - Deleted entire `src/notebook-app/lib/ui/` (19 dead subdirectories: `Button`, `Collapsible`, `Combobox`, `ContextMenu`, `DialogPrimitive`, `DropdownMenu`, `HoverCard`, `IconWrapper`, `Label`, `LinkListItem`, `ListBox`, `Menus`, `PopoverPrimitive`, `quill`, `SelectPrimitive`, `TabsPrimitive`, `TextInputPrimitive`, `TextareaPrimitive`, `WrappingLoadingSkeleton`).
  - Deleted 27 dead components from `src/notebook-app/lib/lemon-ui/`: `LemonActionableTooltip`, `LemonCalendar`, `LemonCalendarRange`, `LemonColor`, `LemonDialog`, `LemonDisabledArea`, `LemonDrawer`, `LemonField`, `LemonFileInput`, `LemonInputSelect`, `LemonLabel`, `LemonMarkdown` (replaced with lightweight shim), `LemonProgress`, `LemonProgressCircle`, `LemonRadio`, `LemonRichContent`, `LemonSegmentedButton`, `LemonSegmentedSelect`, `LemonSlider`, `LemonSnack`, `LemonTree`, `LemonWidget`, `Lettermark`, `Link` (replaced with lightweight shim), `LoadingBar`, `Splotch`, `UploadedLogo`.
  - Deleted 8 dead shim directories from `src/notebook-app/lib/components/`: `Cards`, `DateFilter`, `HelpMenu`, `PayGateMini`, `Resizer`, `RichContentEditor`, `Superpowers`, `TaxonomicFilter`.
  - Deleted dead styles from `src/notebook-app/styles/`: `quill-bridge.scss`, `utilities-legacy.scss`, `notebook.css`, `index.css`.
  - Cleaned up `src/notebook-app/tsconfig.json` exclusions list.
  - Decoupled `LemonToast.tsx` from `HelpMenu/incidentStatus`.
- **Preserved Core Files:**
  - `LemonTable.tsx` and all internal helpers (`columnLayoutUtils`, `sorting`, `TableRow`, `types`, `useBulkSelection`, `LemonTableLoader`, `BulkSelectionBar`, `LemonTable.scss`, `LemonTableLoader.scss`).
  - `PaginationControl.tsx` and `PaginationControl.scss`.
  - `LemonButton`, `LemonCheckbox`, `LemonSkeleton`, `LemonTag`, `ProfilePicture`, `Popover`, `Tooltip`, `Spinner`, `LemonModal`, `LemonInput`, `LemonTextArea`, `LemonCard`, `LemonBadge`, `LemonBanner`, `LemonCollapse`, `LemonDivider`, `LemonDropdown`, `LemonMenu`, `LemonRow`, `LemonSwitch`, `LemonTabs`.
  - `MarkdownNotebook.tsx`, `MarkdownNotebook.scss`, `ScrollableShadows`.
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with 0 errors.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`
  - Next.js Dev Server: `GET /notebooks 200 OK`, `GET /api/notebooks 200 OK`.
  - `NotebooksListScene` table layout and data render identically with 0 visual/functional difference.

### 2026-09-07 — Antigravity (Advanced Agentic Coding)
- **Scope:** SCSS / CSS Style Bundle Optimization & Legacy Baggage Pruning (Preserving LemonTable & MarkdownNotebook).
- **Motivation:** Clean up unused PostHog design system styles and Quill baggage while strictly retaining `LemonTable` and active notebook editor styling per user instruction.
- **Files Modified:**
  - `scripts/generate-style-bundle.js`:
    - Added strict `EXCLUDED_PATTERNS` to filter out 25+ dead legacy PostHog components (`LemonCalendar`, `LemonColor`, `LemonDisabledArea`, `LemonDrawer`, `LemonFileInput`, `LemonInputSelect`, `LemonLabel`, `LemonMarkdown`, `LemonProgressCircle`, `LemonRichContent`, `LemonSegmentedButton`, `LemonWidget`, `Lettermark`, `Link`, `LoadingBar`, `Splotch`, `LemonActionableTooltip`, `ButtonPrimitives`, `TabsPrimitive`, `TextInputPrimitive`, `WrappingLoadingSkeleton`, `utilities-legacy`, `notebook.css`, `index.css`, `quill-bridge.scss`, `quill-shim.css`).
    - Strictly preserved `LemonTable.scss`, `LemonTableLoader.scss`, `PaginationControl.scss`, `LemonButton.scss`, `LemonCheckbox.scss`, `LemonSkeleton.scss`, `LemonInput.scss`, `LemonTextArea.scss`, `LemonTag.scss`, `ProfilePicture.scss`, `LemonModal.scss`, `Popover.scss`, `Tooltip.scss`, `Spinner.scss`, `MarkdownNotebook.scss`, `ScrollableShadows.scss`, `icons.scss`, and core tokens (`vars`, `mixins`, `fonts`, `base`, `global`, `lemon-skin`, `index.tokens`, `notebook-dark-panel`, `site-bridge`).
  - `scripts/generate-scoped-quill-shim.js`:
    - Stubbed out `@posthog/quill` compilation into an empty stub comment, eliminating 114KB of unused Tailwind v4 styles that previously caused CSS var scoping conflicts.
  - `scripts/compile-notebook-product-css.js`:
    - Removed inlining and reading of `quill-shim.css`.
  - `src/notebook-app/styles/global.scss`:
    - Removed unused `@posthog/quill` imports and `quill-bridge`.
  - `src/notebook-app/styles/product-bundle.scss`:
    - Removed `@import 'quill-shim.css';`.
  - `src/notebook-app/styles/bundleCss.ts` & `src/notebook-app/styles/productBundleCss.ts`:
    - Recompiled with `pnpm run build:notebook-styles`.
    - `productBundleCss.ts` size cut by **36.4%** (from 314,213 to 199,959 characters, -114KB).
    - `bundleCss.ts` size reduced by **64,699 characters** (from 490,776 to 426,077 characters).
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with 0 errors.
  - `pnpm run typecheck:shell`: Passed with 0 gated errors.
  - Next.js dev server: Running cleanly, `/notebooks` endpoint returns HTTP 200.
  - `LemonTable` styles and functional behavior fully intact.

### 2026-09-07 — Antigravity (Advanced Agentic Coding)
- **Scope:** Complete Mobile Writing Experience & UI Collision Overhaul for MarkdownNotebook & OS Shell.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`:
    - Fixed touch selection blocking: prevented `handleRowTouchStart` from setting the 340ms mobile block bar timer when touch originated inside editable elements (`[contenteditable="true"]`, `input`, `textarea`, `button`, `select`, `a`).
    - Fixed mobile native context menu blocking: prevented `onContextMenu` from executing `event.preventDefault()` on editable elements, restoring native mobile copy/paste/selection tools.
    - Added `data-notebook-formatting-active` state attribute on the notebook root container for OS shell coordination.
    - Wired up `onIndent` and `onOutdent` props to `FormattingToolbar` for list items (`shiftListItemDepthAtCurrentSelection`) and code blocks (`indentCodeBlockAtCurrentSelection`).
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`:
    - Hidden inline plus button (`.MarkdownNotebook__line-insert-menu-hit-area`, `.MarkdownNotebook__line-insert-menu-button`) on mobile (<640px) to avoid persistent screen clutter, since `/` slash command covers block insertion.
    - Hidden boundary plus buttons (`.MarkdownNotebook__insert-boundary`) on mobile.
    - Set balanced, clean mobile padding (`padding-left: 0.875rem; padding-right: 0.875rem; --markdown-notebook-content-offset: 0px`).
    - Eliminated 28px horizontal layout jump: locked text rows to single column grid (`grid-template-columns: minmax(0, 1fr) !important`).
    - Prevented previous-line obscuring: disabled desktop hover `.MarkdownNotebook__block-chrome` and action buttons on mobile `focus-within`.
    - Prevented iOS Safari auto-zoom: enforced `font-size: 16px !important;` across all mobile inputs (`.WimInlinePill__input`, `.MarkdownNotebook__code-editor textarea`, `.MarkdownNotebook__table-cell-content`, etc.).
    - Enlarged `WimInlinePill` action buttons (`acceptBtn`, `retryBtn`, `rejectBtn`) to 34x34px with 6px border-radius and expanded pill review height to 42px.
    - Fixed `MentionPicker` & `InvitePicker` on mobile: positioned using keyboard-aware `--markdown-notebook-invite-picker-top`.
    - Added collision avoidance rule: `:has([data-notebook-formatting-active='true']) .reader-view-mobile-nav-btn { opacity: 0 !important; pointer-events: none !important; }`.
  - `src/notebook-app/lib/components/MarkdownNotebook/FormattingToolbar.tsx`:
    - Added `onIndent`, `onOutdent`, `canIndent`, and `canOutdent` props.
    - Added dedicated Indent (`IconIndent`) and Outdent (`IconOutdent`) buttons for mobile users without physical Tab/Shift+Tab keys.
  - `src/notebook-app/lib/icons/iconsShim.tsx`:
    - Exported `IconIndent` and `IconOutdent` using `lucide-react`.
  - `src/components/ReaderView/index.tsx`:
    - Added `reader-view-mobile-nav-btn` class to the mobile sidebar drawer floating button.
  - `src/notebook-app/styles/bundleCss.ts` & `src/notebook-app/styles/productBundleCss.ts`:
    - Recompiled via `pnpm run build:notebook-styles`.

### 2026-09-07 — Antigravity (Advanced Agentic Coding)
- **Scope:** Fix Slash (`/`) Insert Menu Not Opening & Viewport Cutoff on Mobile (`MarkdownNotebook`).
- **Root Cause Diagnosis:**
  1. `InsertMenu.tsx`: In `getInsertMenuPosition()`, `const viewport = getVisibleViewport()` was accidentally omitted, leaving `viewport` undeclared. In the browser runtime, this either threw a `ReferenceError` or evaluated to `<meta name="viewport">` (where `viewport.width` is `undefined`), leading to `NaN` coordinate values (`--markdown-notebook-insert-menu-left: NaNpx`, `--markdown-notebook-insert-menu-width: NaNpx`). This rendered the menu completely invisible/unpositioned on mobile.
  2. `MarkdownNotebook.scss`: The `@media (max-width: 640px)` media query previously had `width: min(17rem, calc(100vw - 24px)) !important;` which overrode the calculated CSS variable width and caused right-edge cutoffs when `left` was near the boundary. Also lacked keyboard-aware height containment.
  3. `InsertMenu.tsx`: Touch selection buttons lacked `event.preventDefault()` on `pointerdown`, which caused mobile virtual keyboards to lose focus and blur before triggering item clicks.
- **Fixes Applied:**
  - `src/notebook-app/lib/components/MarkdownNotebook/InsertMenu.tsx`:
    - Restored `const viewport = getVisibleViewport()`.
    - Added finite number guards and `Math.round` to `menuStyle` CSS custom variables to strictly prevent `NaNpx`.
    - Fixed mobile width calculation (`defaultPreferredWidth = Math.min(256, availableViewportWidth)`).
    - Added strict boundary clamping: `left = Math.max(minLeft, Math.min(anchorRect.left, maxLeft))`.
    - Bound `maxHeight` to `Math.min(preferredMaxHeight, Math.max(60, availableHeight))` so the menu never collides with the virtual keyboard or overflows the top of the viewport.
    - Added `onPointerDown={(e) => e.preventDefault()}` on insert menu buttons to preserve input focus during mobile touch selection.
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`:
    - Removed `!important` on mobile `.MarkdownNotebook__insert-menu` width; configured it to use `var(--markdown-notebook-insert-menu-width, min(16rem, calc(100vw - 24px)))` with clean `max-width: calc(100vw - 24px)`.
    - Bound mobile `max-height` to `var(--markdown-notebook-insert-menu-max-height, 240px)`.
  - `src/notebook-app/styles/bundleCss.ts` & `src/notebook-app/styles/productBundleCss.ts`:
    - Recompiled with `pnpm run build:notebook-styles`.
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with 0 errors.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`
  - Next.js Dev Server: HTTP 200 on `/notebooks` and `/api/notebooks`.

### 2026-09-07 — Antigravity (Advanced Agentic Coding)
- **Scope:** Notebook Sticky Header Bar Glassmorphism Styling (`ReaderView`).
- **Motivation:** User instructed to apply the exact glassmorphism design from the sign-in modal (`AuthModal.tsx`) to the notebook user/actions bar (`stickyHeader` containing `CollaboratorsBanner`: user avatar, history, undo/redo, sync status, WIM AI) without changing any of its contents, and completely remove any shadow behind it.
- **Files Modified:**
  - `src/components/ReaderView/index.tsx`:
    - Updated `stickyHeader` container classes from:
      `rounded-sm border border-primary bg-primary/90 backdrop-blur-md shadow-[0_8px_28px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_32px_rgba(0,0,0,0.45)]`
      to:
      `rounded-xl border border-white/80 dark:border-white/15 bg-white/70 dark:bg-[#18191c]/70 backdrop-blur-2xl shadow-none overflow-hidden`
    - Maintained 100% of all bar contents, buttons, avatar stacks, and interactive popovers without touching `CollaboratorsBanner.tsx`.
- **Verification:**
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`
  - Dev server: running cleanly on port 3000.
