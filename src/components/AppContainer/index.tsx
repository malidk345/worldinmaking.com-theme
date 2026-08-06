import React from 'react'
import { useWindowLayoutAttributes } from 'hooks/useWindowLayoutAttributes'

type AppContainerProps = {
    children: React.ReactNode
    className?: string
    /** Forwarded to the root #app-container div (theme / SSR mismatches). */
    suppressHydrationWarning?: boolean
}

// Subscribes to window layout state only to set data attributes on #app-container.
const AppContainer = React.memo(function AppContainer({
    children,
    className = '',
    suppressHydrationWarning,
}: AppContainerProps) {
    const { hasExpandedWindow, hasSnappedLeftWindow, hasSnappedRightWindow } = useWindowLayoutAttributes()

    return (
        <div
            data-scheme="primary"
            id="app-container"
            data-window-expanded={hasExpandedWindow || undefined}
            data-window-snapped-left={hasSnappedLeftWindow || undefined}
            data-window-snapped-right={hasSnappedRightWindow || undefined}
            className={className}
            suppressHydrationWarning={suppressHydrationWarning}
        >
            {children}
        </div>
    )
})

export default AppContainer
