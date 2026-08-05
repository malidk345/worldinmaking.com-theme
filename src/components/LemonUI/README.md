# Lemon UI on this site

**Full guide:** [docs/architecture/lemon-ui-site-integration.md](../../../docs/architecture/lemon-ui-site-integration.md)

## Use for new work

```tsx
import { LemonScope } from 'components/LemonScope'
import { LemonButton, LemonInput } from '@posthog/lemon-ui'

export function SettingsPanel() {
    return (
        <LemonScope>
            <LemonButton type="primary">Save</LemonButton>
            <LemonInput placeholder="Name" />
        </LemonScope>
    )
}
```

## Rules

1. Wrap with **`<LemonScope>`** (notebook App already is a scope root).
2. Never global `lemon-ui.css` — fights real `LemonButton__chrome`.
3. Never put `notebook-app-scope` on `body`.
4. Do not edit `notebook-app/lib/lemon-ui/**` for site layout.
5. OS chrome stays outside LemonScope.
