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


---

## 5. AI Change History & Log

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
