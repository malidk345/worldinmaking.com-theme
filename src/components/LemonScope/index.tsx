import React, { useEffect } from 'react'
import { ensureLemonStyles, releaseLemonStyles, LEMON_SCOPE_CLASS } from 'lib/lemon/ensureLemonStyles'
import { useSiteThemeSync } from '../../notebook-app/lib/useSiteThemeSync'

export type LemonScopeProps = {
    children: React.ReactNode
    className?: string
    /** Site color scheme for host OS tokens (optional). */
    scheme?: 'primary' | 'secondary' | 'tertiary'
    /**
     * When true (default), fill available parent height — good inside AppWindow.
     * Set false for document-flow blocks on marketing pages.
     */
    fill?: boolean
}

/**
 * Product-UI island: full notebook Lemon styles + tokens without leaking onto the OS site.
 *
 * ```tsx
 * import { LemonScope } from 'components/LemonScope'
 * import { LemonButton } from '@posthog/lemon-ui'
 *
 * <LemonScope>
 *   <LemonButton type="primary">Save</LemonButton>
 * </LemonScope>
 * ```
 *
 * Rules:
 * - Always wrap Lemon UI used outside /notebooks with this (or an ancestor LemonScope).
 * - Do not put OS chrome (taskbar, AppWindow chrome) inside LemonScope.
 * - Portals (dropdown/modal) already carry `notebook-app-scope` on their root.
 */
export function LemonScope({
    children,
    className = '',
    scheme = 'primary',
    fill = true,
}: LemonScopeProps): JSX.Element {
    const hostTheme = useSiteThemeSync()

    useEffect(() => {
        ensureLemonStyles()
        return () => {
            releaseLemonStyles()
        }
    }, [])

    return (
        <div
            data-lemon-scope
            data-scheme={scheme}
            data-host-theme={hostTheme}
            className={`${LEMON_SCOPE_CLASS} ${hostTheme === 'dark' ? 'dark' : ''} ${
                fill ? 'h-full min-h-0' : ''
            } ${className}`.trim()}
        >
            {children}
        </div>
    )
}

export default LemonScope

