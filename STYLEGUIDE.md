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

## 4. Lemon UI & Quill Isolation Architecture ("Cam Fanus" Mimarisi)

The Notebook product uses `@posthog/lemon-ui` controls (`LemonButton`, `LemonInput`, `LemonSelect`) and `@posthog/quill` rich text editing components.

### 🛡️ Why Scope Isolation ("Cam Fanus") Exists
Third-party component frameworks like Lemon UI and Quill contain heavy default CSS resets, typography rules, and `:root` variables. If un-scoped, they leak into the host OS shell and corrupt window title bars, taskbars, and global typography alignment.

- **Strict Containment:** All Lemon UI and Quill styles are strictly scoped inside `.notebook-app-scope` (via `generate-scoped-quill-shim.js` and `ensureLemonStyles.ts`).
- **Zero Global Pollution:** `:root` and `@property` selectors are bound strictly to container scopes, preventing layout shift or font distortion across the OS site.

### 🎨 100% Theme Harmony & Live Color Sync
Scope isolation does **NOT** mean visual disconnection:
- **Site Variable Bridge:** `NOTEBOOK_PALETTE_CSS` bridges host CSS variables (`--bg`, `--accent`, `--text-primary`, `--border`) directly into `.notebook-app-scope`.
- **Live Dark Mode:** When the host OS toggles between `light` and `dark` modes, Lemon UI buttons and Quill editor surfaces **instantly update their colors to 100% match the site**.

### Usage Contract
- **Always Wrap:** Outside of `/notebooks` routes, ALWAYS wrap Lemon UI & Quill controls with `<LemonScope>`.
- **Never Global:** NEVER add `notebook-app-scope` class to `body` or global page wrapper.

```tsx
import { LemonScope } from 'components/LemonScope'
import { LemonButton, LemonInput } from '@posthog/lemon-ui'

export function ActionPanel() {
    return (
        <LemonScope>
            <LemonInput placeholder="Notebook title..." />
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
