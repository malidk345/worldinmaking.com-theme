import { useEffect, useState } from 'react'

/**
 * Mirror host site light/dark onto the notebook shell without touching Lemon UI.
 * Host sets class "light" | "dark" on body and/or html (Display options / theme script).
 */
export function useSiteThemeSync(): 'light' | 'dark' {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => readHostTheme())

    useEffect(() => {
        const apply = () => setTheme(readHostTheme())
        apply()

        const obs = new MutationObserver(apply)
        if (document.body) {
            obs.observe(document.body, { attributes: true, attributeFilter: ['class'] })
        }
        if (document.documentElement) {
            obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        }

        const onStorage = () => apply()
        window.addEventListener('storage', onStorage)

        // Chain after host theme setter when present
        const prev = window.__onThemeChange
        window.__onThemeChange = (t: string) => {
            if (typeof prev === 'function') prev(t)
            apply()
        }

        return () => {
            obs.disconnect()
            window.removeEventListener('storage', onStorage)
            if (window.__onThemeChange) {
                window.__onThemeChange = prev || (() => {})
            }
        }
    }, [])

    return theme
}

function readHostTheme(): 'light' | 'dark' {
    if (typeof document === 'undefined') return 'light'
    const fromBody = document.body?.classList.contains('dark')
    const fromHtml = document.documentElement?.classList.contains('dark')
    return fromBody || fromHtml ? 'dark' : 'light'
}
