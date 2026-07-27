import type { Metadata } from 'next'
import { Providers } from './providers'
import '../styles/global.css'

export const metadata: Metadata = {
    title: 'PostHog – The product analytics platform engineers love',
    description:
        'The single platform for engineers to analyze, test, observe, and deploy new features. Product analytics, session replay, feature flags, experiments, CDP, and more.',
    openGraph: {
        images: ['/images/og/default.png'],
    },
}

const themeScript = `(function () {
    window.__onThemeChange = function () {}
    var preferredTheme
    var siteSettings = {}
    var darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
    try {
        preferredTheme = localStorage.getItem('theme') || 'light'
    } catch (err) {}
    try {
        siteSettings = JSON.parse(localStorage.getItem('siteSettings') || '{}')
    } catch (err) {}

    var theme = preferredTheme === 'system' ? (darkQuery.matches ? 'dark' : 'light') : preferredTheme
    var skin = siteSettings.skin || 'modern'
    var wallpaper = siteSettings.wallpaper || 'keyboard-garden'
    var reduceTransparency = siteSettings.reduceTransparency ? 'true' : 'false'

    function applyAttributes(el) {
        if (!el) return
        el.className = theme
        el.setAttribute('data-skin', skin)
        el.setAttribute('data-wallpaper', wallpaper)
        el.setAttribute('data-reduce-transparency', reduceTransparency)
    }

    window.__theme = theme
    if (document.documentElement) applyAttributes(document.documentElement)

    window.__setPreferredTheme = function (newThemeChoice) {
        const nextTheme = newThemeChoice === 'system' ? (darkQuery.matches ? 'dark' : 'light') : newThemeChoice
        window.__theme = nextTheme
        if (document.documentElement) document.documentElement.className = nextTheme
        if (document.body) document.body.className = nextTheme
        window.__onThemeChange(nextTheme)
        try {
            localStorage.setItem('theme', nextTheme)
        } catch (err) {}
        return nextTheme
    }

    if (document.body) {
        applyAttributes(document.body)
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            if (document.body) applyAttributes(document.body)
        })
    }
})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="light" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            </head>
            <body data-scheme="primary" data-skin="modern" data-wallpaper="keyboard-garden" suppressHydrationWarning>
                <div data-scheme="primary" suppressHydrationWarning className="h-screen w-screen overflow-hidden bg-light dark:bg-dark text-primary">
                    <Providers>{children}</Providers>
                </div>
            </body>
        </html>
    )
}