import React, { useEffect } from 'react'
import { ensureLemonStyles } from 'lib/lemon/ensureLemonStyles'

export type LemonProviderProps = {
    children: React.ReactNode
    /**
     * When true, inject full Lemon CSS as soon as the app mounts (good if most
     * routes use product UI). Default false — styles load on first LemonScope /
     * notebook open (smaller marketing pages).
     */
    eager?: boolean
}

/**
 * Optional site root helper. Does not wrap children in a scope div — that would
 * restyle the entire OS desktop. Use <LemonScope> around product islands only.
 *
 * Prefer: eager={false} + <LemonScope> per feature.
 * Or: eager on routes that always need Lemon (e.g. heavy admin shells).
 */
export function LemonProvider({ children, eager = false }: LemonProviderProps): JSX.Element {
    useEffect(() => {
        if (!eager) return
        ensureLemonStyles()
    }, [eager])

    return <>{children}</>
}

export default LemonProvider
