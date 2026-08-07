/**
 * iconsShim.tsx
 *
 * The notebook-app webpack config aliases `@posthog/icons` → this file for all
 * notebook-app source files. We then re-export from the REAL @posthog/icons package —
 * the webpack alias skips iconsShim.tsx itself (exception in next.config.js),
 * so this import resolves to node_modules normally.
 *
 * Result: notebook-app icons are VISUALLY IDENTICAL to the main site icons.
 */
export * from '@posthog/icons'

import React from 'react'

export function IconWithCount(props: { children: React.ReactNode; count?: number }) {
    return <span className="inline-flex items-center gap-1">{props.children}</span>
}

export function IconWithBadge(props: { children: React.ReactNode }) {
    return <span className="inline-flex items-center gap-1">{props.children}</span>
}
