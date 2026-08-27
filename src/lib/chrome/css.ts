import { FALLBACK_CHROME, type ChromeSnapshot } from './tokens'

/** Host-vocabulary utilities for sandboxed previews. Same names as the OS Tailwind map. */
export function chromeStylesheet(snap: ChromeSnapshot = FALLBACK_CHROME): string {
    return `
:root {
  --bg: ${snap.bg};
  --accent: ${snap.accent};
  --border: ${snap.border};
  --text-primary: ${snap.textPrimary};
  --text-secondary: ${snap.textSecondary};
  --text-muted: ${snap.textMuted};
  --input-bg: ${snap.inputBg};
  --input-border: ${snap.inputBorder};
  --radius: ${snap.radius};
}
html, body, #root {
  background: rgb(var(--bg));
  color: rgb(var(--text-primary));
  font-family: ${snap.font};
  margin: 0;
  height: 100%;
  min-height: 100%;
}
.bg-primary { background-color: rgb(var(--bg)); }
.bg-accent { background-color: rgb(var(--accent)); }
.bg-input { background-color: rgb(var(--input-bg)); }
.bg-navy { background-color: ${snap.navy}; }
.bg-navy\\/90 { background-color: color-mix(in srgb, ${snap.navy} 90%, transparent); }
.text-primary { color: rgb(var(--text-primary)); }
.text-secondary { color: rgb(var(--text-secondary)); }
.text-muted { color: rgb(var(--text-muted)); }
.text-navy { color: ${snap.navy}; }
.text-white { color: #fff; }
.border-primary { border-color: rgb(var(--border)); }
.border-navy { border-color: ${snap.navy}; }
.ring-navy { --tw-ring-color: ${snap.navy}; }
.rounded, .rounded-md, .rounded-lg, .rounded-xl { border-radius: var(--radius); }
.rounded-sm { border-radius: 4px; }
.shadow, .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl, .shadow-2xl, .shadow-2xs { box-shadow: none; }
.min-h-screen, .min-h-full { min-height: 100%; }
.min-h-0 { min-height: 0; }
.min-w-0 { min-width: 0; }
`.trim()
}
