## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.
## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons in OS Taskbar components
**Learning:** Found several icon-only navigation and interaction buttons (`OSButton`) throughout the taskbar (NotificationCenter, AmbientPlayer, TaskBarMenu) lacking `aria-label` attributes. Screen reader users would have zero context for these interactive elements, despite visual tooltips existing for sighted users.
**Action:** Always ensure any `<OSButton>` or interactive element that relies solely on an icon visually includes an explicit `aria-label` attribute describing its function (e.g., "Toggle notifications", "Open search").
