# WorldInMaking / posthog.com — Design & Style Guide

**Location:** `STYLEGUIDE.md`  
**Applies To:** Developers and AI models creating UI components, pages, or content for WorldInMaking.

---

## 1. Design Aesthetics & Visual Identity

WorldInMaking is a **Desktop OS product shell** (windows, taskbar, command palette, notebooks, AI philosopher bots) built on Next.js 14 and React 18.

- **Vibrant & Premium:** Avoid plain generic colors. Use curated HSL color schemes, dark mode support, and frosted glassmorphism (`backdrop-blur-md`).
- **Typography:** Modern typography (Inter, Outfit, Roboto Mono). Avoid default browser fallbacks.
- **Micro-Animations:** Use subtle hover transitions (`transition-all duration-200 ease-in-out`), active states, and desktop window drag/minimize effects.

---

## 2. Tailwind & Color Token Rules

### Strict Color Constraints
- ❌ **Forbidden:** Stock Tailwind colors (e.g. `bg-blue-500`, `text-gray-700`, `border-red-400`).
- ✅ **Required:** Projct-specific color tokens defined in `tailwind.config.js` and `global.css`.

### Standard Tokens

| Utility Type | Approved Tokens |
|--------------|-----------------|
| **Backgrounds** | `bg-primary`, `bg-accent`, `bg-secondary` |
| **Text** | `text-primary`, `text-secondary`, `text-muted`, `text-input` |
| **Borders** | `border-primary`, `border-input`, `border-accent` |

```tsx
// ✅ Correct (Using site tokens)
<div className="bg-primary text-primary border-primary border p-4 rounded-lg">
    <h2 className="text-secondary font-semibold">Title</h2>
</div>

// ❌ Wrong (Using stock Tailwind colors)
<div className="bg-white text-black border-gray-200">
```

---

## 3. Dynamic Color Schemes & Attributes

The site supports dynamic color modes and OS skin customizations driven by HTML data attributes:

### `data-scheme` Layering

| Attribute | Typical Usage | Description |
|-----------|---------------|-------------|
| `data-scheme="primary"` | Main page content / window body | Main focus area |
| `data-scheme="secondary"` | Sidebars, drawers, cards | Secondary accent layer |
| `data-scheme="tertiary"` | Window chrome & title bars | Window control surfaces |

```tsx
<div data-scheme="secondary" className="bg-primary text-primary">
    {/* Content automatically adopts secondary scheme styling */}
</div>
```

> **Note:** Colors automatically switch between light and dark modes based on the `body` class (`light` or `dark`). Avoid over-using Tailwind's `dark:` modifier when `bg-primary` or `text-primary` already handles the shift.

---

## 4. Lemon UI Enclosure Rules (Notebook Components)

The Notebook product uses `@posthog/lemon-ui` components (`LemonButton`, `LemonInput`, `LemonSelect`).

- **Always Wrap:** Outside of `/notebooks` routes, ALWAYS wrap Lemon UI controls with `<LemonScope>`.
- **Isolation:** NEVER add `notebook-app-scope` class to `body` or global wrapper (prevents Lemon UI styles from polluting OS window chrome).

```tsx
import { LemonScope } from 'components/LemonScope'
import { LemonButton } from '@posthog/lemon-ui'

export function ActionPanel() {
    return (
        <LemonScope>
            <LemonButton type="primary">Save Notebook</LemonButton>
        </LemonScope>
    )
}
```

---

## 5. Image & Asset Rules

- Always use `next/image` with explicit width/height or `fill` mode.
- Allowed remote domains: Cloudinary (`res.cloudinary.com`), GitHub (`user-images.githubusercontent.com`), Supabase Storage (`*.supabase.co`).
- Never set `unoptimized: true` in `next.config.js`.

---

## 6. Documentation & Copywriting Standards

- **Language:** Use American English.
- **Headings:** Use sentence case for section headings (e.g. *"Documentation style guide"*, not *"Documentation Style Guide"*).
- **Oxford Comma:** Use the Oxford comma for lists (*"bananas, apples, and oranges"*).
- **Formatting:** Wrap inline code in backticks (`code`) and block code in triple-backtick markdown fences with explicit language tags.
