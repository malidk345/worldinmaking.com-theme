## 2024-05-18 - Improve accessibility of pagination controls
**Learning:** Icon-only interactive elements lacking labels and keyboard navigation prevent screen readers from understanding functionality, hurting accessibility.
**Action:** Next time, ensure all clickable elements have `role="button"`, `aria-label`, `tabIndex`, and keyboard event handlers (`onKeyDown`)
