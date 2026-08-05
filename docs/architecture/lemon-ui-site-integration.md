# Lemon UI ↔ site integration

How full notebook Lemon UI lives inside the posthog.com OS shell without style wars.

## Two design systems (intentional)

| Layer | Tokens / components | Used for |
|--------|---------------------|----------|
| **OS shell** | `data-scheme`, `bg-primary`, `OSButton`, frosted `WINDOW_BG` | Desktop, taskbar, AppWindow chrome, marketing |
| **Product UI (Lemon)** | `--bg-3000`, `--primary-3000`, `LemonButton` + `__chrome` | Notebook, dense product panels, tables, modals |

Do **not** restyle Lemon components to look like OSButton. Do **not** put OS chrome inside a Lemon scope.

## Scope isolation (critical)

Full Lemon CSS is compiled as:

```css
.notebook-app-scope { /* tokens + Lemon + nested Tailwind */ }
```

### Rules

1. **Never** put `notebook-app-scope` on `document.body` — that applies nested Tailwind base to the whole OS site.
2. Put the class only on:
   - Notebook `App` root
   - `<LemonScope>` roots (new product surfaces)
   - Portal roots (already: Popover, LemonModal)
3. Inject CSS once via `ensureLemonStyles()` (head `<style id="notebook-app-styles">`).

## How to build new product UI on the site

```tsx
import { LemonScope } from 'components/LemonScope'
import { LemonButton, LemonInput, LemonTable } from '@posthog/lemon-ui'
// or: import { LemonScope, LemonButton } from 'components/PostHogUI'

export function BillingPanel() {
    return (
        <LemonScope>
            <h2 className="text-lg font-semibold mb-4">Billing</h2>
            <LemonInput placeholder="Search…" />
            <LemonButton type="primary">Save</LemonButton>
        </LemonScope>
    )
}
```

### Inside an AppWindow

```
AppWindow (WINDOW_BG, toolbar)     ← OS shell tokens
  └── LemonScope / Notebook App   ← product tokens only here
        └── LemonButton, …
```

### Theme

Site Display options set `body` / `html` to `light` | `dark`.  
`useSiteThemeSync` mirrors that onto the Lemon root as class `dark` so notebook CSS variables update.

## Imports

| Import | Meaning |
|--------|---------|
| `@posthog/lemon-ui` | Full notebook Lemon components (webpack + tsconfig alias) |
| `components/LemonScope` | Required wrapper for non-notebook Lemon usage |
| `components/PostHogUI` | Barrel: Scope + full Lemon re-exports |
| `~nb-lib/*` | Notebook-internal lib path |

Do **not** import `components/LemonUI/lemon-ui.css` globally — thin styles fight `LemonButton__chrome`.

## Build / tokens

- Source of truth for Lemon tokens: `posthog-notebook-app` → copied into `src/notebook-app/styles/`
- Rebuild after style edits: `pnpm run build:notebook-styles`
- Output: `src/notebook-app/styles/bundleCss.ts` (`NOTEBOOK_APP_CSS`)

## Checklist for a new Lemon surface

- [ ] Wrapped in `<LemonScope>` (or under Notebook App)
- [ ] No outer thin `lemon-ui.css` / extra button frames
- [ ] OS chrome stays outside the scope
- [ ] Light/dark verified with Display options
- [ ] Dropdown/modal open correctly (portal has `notebook-app-scope`)
- [ ] Did not edit `notebook-app/lib/lemon-ui/**` component implementations for layout hacks

## Future (optional)

1. Split CSS: “tokens + Lemon components” vs “full nested Tailwind” for smaller inject.
2. Shared brand tokens JSON for site navy vs notebook 3000 (if product wants one brand).
3. Storybook / gallery page under LemonScope for visual QA.
