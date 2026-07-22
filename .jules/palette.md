## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.
## 2024-07-22 - Icon-Only Button Accessibility in Data Tables/Lists
**Learning:** Icon-only buttons used for statuses (like pending/error) or actions (like download) within mapped lists (like `SidePanelExports`) lack context for screen readers and sighted users when disabled. Adding `aria-label` ensures screen reader compatibility, and `title` provides a helpful tooltip on hover, especially useful for explaining disabled states or icons with no text labels.
**Action:** Always provide both `aria-label` and `title` to icon-only buttons, even when they represent non-interactive states like "loading" or "error", so users can understand their purpose and current status.
