/**
 * Adapter: LLM / shadcn / slate class names → host OS tokens.
 *
 * Order is the contract. shadcn `bg-primary` (brand) must become `bg-navy`
 * before we introduce host `bg-primary` (paper) from `bg-background`.
 */

const SWAPS: Array<[RegExp, string]> = [
    [/\btext-primary-foreground\b/g, 'text-white'],
    [/\bbg-primary(\/[\d.]+)?(?!-foreground)\b/g, 'bg-navy$1'],
    [/\btext-primary(?!-foreground)\b/g, 'text-navy'],
    [/\bbg-primary-foreground\b/g, 'bg-primary'],
    [/\bbg-background\b/g, 'bg-primary'],
    [/\btext-foreground\b/g, 'text-primary'],
    [/\btext-muted-foreground\b/g, 'text-muted'],
    [/\btext-card-foreground\b/g, 'text-primary'],
    [/\btext-popover-foreground\b/g, 'text-primary'],
    [/\btext-secondary-foreground\b/g, 'text-primary'],
    [/\btext-accent-foreground\b/g, 'text-primary'],
    [/\bbg-card\b/g, 'bg-primary'],
    [/\bbg-popover\b/g, 'bg-primary'],
    [/\bbg-muted(?:\/[\d.]+)?\b/g, 'bg-accent'],
    [/\bbg-secondary\b/g, 'bg-accent'],
    [/\bborder-border\b/g, 'border-primary'],
    [/\bborder-input\b/g, 'border-primary'],
    [/\bbg-border\b/g, 'bg-accent'],
    [/\bring-ring\b/g, 'ring-navy'],
    [/\bbg-(?:slate|gray|zinc|neutral|stone)-(?:50|100)(?:\/[\d.]+)?\b/g, 'bg-primary'],
    [/\bbg-(?:slate|gray|zinc|neutral|stone)-(?:200|300)(?:\/[\d.]+)?\b/g, 'bg-accent'],
    [/\bbg-(?:slate|gray|zinc|neutral|stone)-(?:700|800|900|950)(?:\/[\d.]+)?\b/g, 'bg-primary'],
    [/\btext-(?:slate|gray|zinc|neutral|stone)-(?:50|100|200)\b/g, 'text-primary'],
    [/\btext-(?:slate|gray|zinc|neutral|stone)-(?:300|400)\b/g, 'text-muted'],
    [/\btext-(?:slate|gray|zinc|neutral|stone)-(?:500|600)\b/g, 'text-secondary'],
    [/\btext-(?:slate|gray|zinc|neutral|stone)-(?:700|800|900|950)\b/g, 'text-primary'],
    [/\bborder-(?:slate|gray|zinc|neutral|stone)-\d{2,3}\b/g, 'border-primary'],
    [/\bbg-(?:violet|indigo|purple|fuchsia)-(?:500|600|700)(?:\/[\d.]+)?\b/g, 'bg-navy'],
    [/\btext-(?:violet|indigo|purple|fuchsia)-(?:500|600|700)\b/g, 'text-navy'],
    [/\bbg-blue-(?:500|600|700)(?:\/[\d.]+)?\b/g, 'bg-navy'],
    [/\btext-blue-(?:500|600|700)\b/g, 'text-navy'],
    [/\bmin-h-screen\b/g, 'min-h-full'],
    [/\brounded-(?:xl|2xl|3xl)\b/g, 'rounded'],
    [/\bshadow-(?:2xs|sm|md|lg|xl|2xl)\b/g, ''],
    [/\bshadow\b/g, ''],
    [/\bbg-\[#(?:0f172a|020617|1e293b|111827|020617)\]/gi, 'bg-primary'],
    [/\btext-\[#(?:f8fafc|f1f5f9|e2e8f0|cbd5e1)\]/gi, 'text-primary'],
    [/\bbg-\[#(?:7c3aed|4f46e5|8b5cf6|6d28d9|6366f1)\]/gi, 'bg-navy'],
]

export function rewriteArtifactChrome(source: string): string {
    let next = String(source || '')
    for (const [pattern, replacement] of SWAPS) {
        next = next.replace(pattern, replacement)
    }
    return next.replace(/[ \t]{2,}/g, ' ').replace(/className=" /g, 'className="').replace(/class=" /g, 'class="')
}
