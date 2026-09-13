import { chromeStylesheet } from './css'
import { readHostChrome } from './host'
import { rewriteArtifactChrome } from './rewrite'
import { FALLBACK_CHROME, type ChromeSnapshot } from './tokens'

export function wrapChromeDocument(html: string, snap?: ChromeSnapshot): string {
    const rewritten = rewriteArtifactChrome(html)
    const css = chromeStylesheet(snap || (typeof document === 'undefined' ? FALLBACK_CHROME : readHostChrome()))
    const style = `<style data-wim-chrome="true">${css}</style>`
    const tailwind = /tailwind/i.test(rewritten) ? '' : '<script src="https://cdn.tailwindcss.com"></script>'
    const needsThree = /THREE\.|OrbitControls/i.test(rewritten)
    const threeScripts = needsThree
        ? '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script><script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>'
        : ''
    const needsLucide = /lucide|data-lucide/i.test(rewritten)
    const lucideScript = needsLucide
        ? '<script src="https://unpkg.com/lucide@latest"></script><script>window.addEventListener("DOMContentLoaded",function(){if(window.lucide&&window.lucide.createIcons){window.lucide.createIcons();}});</script>'
        : ''
    const needsChart = /Chart\(|chart\.js/i.test(rewritten)
    const chartScript = needsChart
        ? '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>'
        : ''
    const errorCatcher = `
<script>
window.addEventListener('error', function(e) {
  console.error('[WIM App Error]', e);
  var el = document.getElementById('wim-error-badge');
  if (!el) {
    el = document.createElement('div');
    el.id = 'wim-error-badge';
    el.style.cssText = 'position:fixed;bottom:10px;left:10px;right:10px;background:#ef4444;color:#fff;padding:6px 10px;border-radius:6px;font:11px monospace;z-index:999999;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
    document.body.appendChild(el);
  }
  el.textContent = 'Runtime error: ' + (e.message || 'Script error');
});
</script>
`.trim()

    const inject = `${tailwind}${threeScripts}${lucideScript}${chartScript}${style}${errorCatcher}`
    if (/<\/head>/i.test(rewritten)) return rewritten.replace(/<\/head>/i, `${inject}</head>`)
    if (/<html[\s>]/i.test(rewritten)) {
        return rewritten.replace(/<html[^>]*>/i, (open) => `${open}<head><meta charset="utf-8"/>${inject}</head>`)
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${inject}</head><body>${rewritten}</body></html>`
}

export const WIM_UI_CHROME_PROMPT = `
VISUAL CHROME — WorldInMaking host tokens only (same names as the OS):
- Surface: bg-primary. Ink: text-primary. Muted: text-muted / text-secondary. Actions: bg-navy text-white (#1D4ED8). Strokes: border-primary. Radius: rounded (6px).
- Import Card, Button, Badge, Tabs, Input, Table from @wim/ui. Borders, not drop shadows.
- Do not use shadcn names (bg-background, text-foreground, bg-primary as a brand fill, text-primary-foreground). Do not use slate-*, zinc-*, violet-*, indigo-*, Inter, or gradient mesh kits.
`.trim()
