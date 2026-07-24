## 2024-05-18 - Taskbar Icon Buttons ARIA Labels
**Learning:** Icon-only buttons used in utility components like taskbars (AmbientPlayer, NotificationCenter, Search, Account Menu) must have explicit `aria-label` attributes to ensure they are accessible to screen readers, since they lack visual text context.
**Action:** Always add `aria-label` attributes describing the button's action (e.g., "Toggle ambient player", "Open search") to icon-only `<OSButton>` elements, instead of relying purely on tooltip wrappers or the `<Icon>` element alone.
