# WorldInMaking Site Improvement Report

## Executive Summary

The site is functional, but its main technical risk is the desktop window layer. Window creation, routing, viewport measurement, persistence, and visual chrome have historically been spread across several files and two different route resolvers. This creates blank-window regressions, stale state updates, and responsive edge cases.

The safest improvement strategy is incremental: preserve the current visual language, stabilize the window manager, then reduce the amount of legacy PostHog application code loaded by the site.

## Current Strengths

- The main site, desktop shell, and notebook route respond successfully in local smoke tests.
- Notebook and search flows are lazy-loaded or isolated from the main shell where appropriate.
- Mobile windows open maximized and account for `visualViewport` changes from the on-screen keyboard.
- Window resize, snap, persistence, focus, and per-window error isolation are present.
- Unresolved dynamic route hrefs are sanitized before navigation.
- Search can use the local Next.js `/api/search` endpoint and Supabase content without requiring Algolia credentials.
- Unused GitHub Actions workflows and clearly unused legacy assets/components have been identified and removed from the working changes.

## Highest Risks

### 1. Window architecture duplication

`AppWindow/index.tsx` still contains routing and window-management responsibilities while `WindowRouter.tsx`, `WindowChrome.tsx`, and `WindowContent.tsx` exist separately. A route can therefore be handled differently depending on which resolver is used.

Impact:

- Blank windows on first navigation
- Different behavior between direct route loads and in-window navigation
- Higher regression risk when adding a new application window

### 2. State shape is still boolean-heavy

Window mode is represented by combinations of `expanded`, `windowed`, and `snapped`. Although a `WindowMode` helper now exists, the underlying state can still express invalid combinations.

Target model:

```ts
type WindowMode = 'normal' | 'maximized' | 'snapped-left' | 'snapped-right' | 'minimized'
```

### 3. Legacy application surface

The repository still contains a large amount of inherited PostHog UI, product navigation, integrations, and templates. Some of it is required by dynamic routes or MDX, but it increases typecheck time, bundle discovery cost, and maintenance overhead.

### 4. Type safety debt

The production build currently ignores TypeScript build errors. The root typecheck includes legacy Gatsby-era components and produces a large existing error set. This makes regressions harder to detect.

### 5. Shared dirty-worktree risk

Window and styling files have concurrent changes. Commits should stage only reviewed files. A broad `git add -A` is unsafe until the current worktree changes are separated and reviewed.

## Recommended Roadmap

### Phase 1: Stabilize windows

1. Make `WindowRouter` the only route resolver.
2. Remove the duplicate local router from `AppWindow/index.tsx` after all routes are covered.
3. Move drag, resize, snap, and viewport calculations into `useWindowManager`.
4. Replace boolean mode fields with a reducer-backed `WindowMode` transition model.
5. Add a normalization function for every window descriptor before it enters state.
6. Add per-window tests for normal, maximized, snapped, minimized, and mobile modes.

### Phase 2: Responsive behavior

1. Test at 320px, 375px, 768px, 1024px, and desktop widths.
2. Verify keyboard open/close using `visualViewport`.
3. Apply safe-area insets for mobile browser chrome and notches.
4. Keep mobile windows maximized by default, with an explicit restore button.
5. Ensure iframe-backed notebook content always receives a measurable parent height.

### Phase 3: Performance

1. Keep heavy route modules lazy-loaded.
2. Use `content-visibility` only for inactive, non-modal windows.
3. Disable expensive motion/backdrop effects while dragging or resizing.
4. Measure First Load JS and route-specific chunks before removing more dependencies.
5. Add a bundle-size budget to local validation rather than relying on CI-only reporting.

### Phase 4: Search and content

1. Continue using `/api/search` as the local search boundary.
2. Add searchable metadata for handbook, tutorial, and navigation content.
3. Cache and invalidate the local index deliberately instead of fetching all posts for every cold process.
4. Rename remaining `Algolia*` component/type names to `SiteSearch*` once compatibility migration is complete.
5. Remove `react-instantsearch` only after the UI no longer depends on its response shape.

### Phase 5: Quality and operations

1. Add Playwright smoke tests for root, desktop, notebooks, blog, forum, and search.
2. Add a mobile screenshot test for window edges and keyboard focus.
3. Re-enable strict typechecking incrementally by route group.
4. Add an error reporting boundary for API and iframe failures.
5. Keep GitHub Actions disabled if intentionally unused, but remove stale repository secrets and old run history separately through GitHub settings.

## Suggested Acceptance Criteria

- No route opens a blank window when launched from the desktop shell.
- A window never exceeds the actual parent container on mobile or desktop resize.
- Opening the keyboard does not zoom the page or cut off the focused input.
- A broken window only shows an error state inside that window.
- Restoring a window layout never places it outside the current viewport.
- Search works with no Algolia environment variables.
- Root and route smoke tests pass after each window-manager change.
- No unrelated dirty-worktree files are included in a commit.

## Immediate Next Action

Finish the window-manager extraction. Move `WindowChrome` and `WindowContent` behind a single `WindowManager` boundary, then delete the duplicate local route resolver. This is the highest-leverage change because it addresses the blank-window issue, responsive behavior, state consistency, and future testability at the same time.
