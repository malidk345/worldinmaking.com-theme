## 2024-07-18 - [Add focus visible styles to OSButton]
**Learning:** `OSButton` component lacks clear visual focus states, reducing keyboard accessibility. This app requires `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20` for standard focus rings.
**Action:** Always ensure custom button components have proper focus rings explicitly set since default browser rings can be subtle or overridden.
## 2024-11-20 - Adding ARIA labels to dynamically mapped icon toolbars
**Learning:** When toolbars are generated dynamically by mapping over an array of button configurations (like in a rich text editor), ensuring accessibility requires mapping an `aria-label` attribute on the generated `<button>` elements. Relying solely on a `title` attribute for tooltips is insufficient for robust screen reader support.
**Action:** Always ensure that data structures defining dynamic buttons include a descriptive text field that can be used for `aria-label`. Include `type="button"` for custom close buttons within such components to prevent unintended form submissions.
