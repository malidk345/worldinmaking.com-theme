import { Html, Head, Main, NextScript } from 'next/document'

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

export default function Document() {
    return (
        <Html lang="en" className="light" suppressHydrationWarning>
            <Head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            </Head>
            <body data-scheme="primary" data-skin="modern" data-wallpaper="keyboard-garden" suppressHydrationWarning>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}

