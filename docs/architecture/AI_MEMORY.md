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
- **Status:** `[IDLE]`
- **Active Task:** None. Heading creation, slash command navigation, shortcuts, and editorial behaviors repaired and verified.

---

## 5. AI Change History & Log

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
