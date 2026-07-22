# AGENTS.md

_This file acts as the primary specification and context guide for AI Coding Agents working in the worldinmaking.com-theme codebase._

**worldinmaking.com** — Next.js desktop-style OS UI web platform featuring draggable, resizable windows, interactive notebooks, community forums, and PostHog 3000 design language integration.

## Commands

```bash
pnpm install                    # Install dependencies (use pnpm, NOT npm)
pnpm dev                        # Local dev server at http://localhost:3000
pnpm build                      # Production build verification
npx tsc --noEmit                # TypeScript type checking across workspace
```

## Project Structure & Key Directories

```
app/                            # Next.js App Router (pages & global layouts)
  globals.css                   # Global Tailwind @theme tokens and CSS custom properties
components/                     # Core React & LemonUI components
  LemonUI/                      # PostHog 3000 design primitives (LemonButton, LemonInput, LemonTable, LemonTag, Popover, Spinner)
  posthog-ui-gallery/           # 1:1 Monorepo UI gallery reference apps and scenes
  Forum/                        # Community Forum section (preserved layout)
  Notebooks/                    # Notebook apps & scenes
  AppWindow/                    # OS Window Chrome & Window Manager
  OSButton/                     # Custom OS button primitives
  RadixUI/                      # Customized Radix UI primitives
constants/                      # Surface tokens, frosted glass constants, prose styles
  frostedSurfaces.ts            # Centralized window & panel surface background rules
  index.ts                      # PROSE_CORE & getProseClasses typography definitions
```

## Design System & Theme Tokens (PostHog 3000)

All UI elements must adhere to the PostHog 3000 Design Language and the **2026 Trend Warm Stone / Titanium Graphite** color tokens:

### Neutral Color Scale
- **`--color-posthog-3000-25`**: `#fafaf9`
- **`--color-posthog-3000-50`**: `#f5f5f4` (Light surface / subtle bg)
- **`--color-posthog-3000-100`**: `#e7e7e4` (Light border / divider)
- **`--color-posthog-3000-150`**: `#d6d3d1` (Bold light border)
- **`--color-posthog-3000-600`**: `#57534e` (Secondary text)
- **`--color-posthog-3000-700`**: `#44403c`
- **`--color-posthog-3000-800`**: `#292524`
- **`--color-posthog-3000-900`**: `#1c1917` (Primary text)

### Accent Colors
- **Light Accent**: Navy Blue (`#1e3a8a` / `#1d4ed8` / `#1e40af`)
- **Dark Surface Primary**: `#121214` (Derin Koyu Füme / Dark Charcoal - Zinc 950)

### Surface & Frosted Glass Constants
- **`WINDOW_BG`**: `bg-white dark:bg-[#121214] transform-gpu`
- **`HEATER_WINDOW_BG`**: `bg-white/60 dark:bg-[#121214]/60 backdrop-blur-xl transform-gpu`

## Code Style & Conventions

### TypeScript & React
```tsx
// Radix UI: Import from local primitives in components/RadixUI/
import MenuBar from 'components/RadixUI/MenuBar'

// Lemon UI Primitives: Import from components/LemonUI/
import { LemonButton, LemonTag, LemonInput } from 'components/LemonUI'
```

### Writing & Formatting Rules
- Double quotes for string literals.
- Sentence casing for all user-facing headings and labels.
- Oxford comma for item lists.
- Avoid hardcoding inline color hex codes when `--color-*` CSS variables or Tailwind tokens are available.

## Agent Boundaries & Guidelines

### Always
- **Read code before editing**: Thoroughly inspect target components and their definitions before mutating code.
- **Use `pnpm`**: Always run `pnpm` commands (`pnpm dev`, `pnpm build`, `npx tsc --noEmit`), never `npm`.
- **Use Container Queries**: Use `@container` queries for window component responsiveness. Windows are resizable independently of browser viewport dimensions.
- **Preserve Comments**: Maintain code comments unless they become completely obsolete.
- **Run Verification**: Always execute `npx tsc --noEmit` after code modifications to confirm zero type errors.

### Never
- **Never modify Community/Forum files** (`components/Forum/`, `components/Community/`) unless explicitly requested by the user.
- **Never hardcode fallback colors** when project theme tokens exist.
- **Never guess file paths or component signatures**—verify with code search tools first.
