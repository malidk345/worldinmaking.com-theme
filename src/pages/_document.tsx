import { Html, Head, Main, NextScript } from 'next/document'
import {
    DEFAULT_WALLPAPER,
    DEFAULT_WALLPAPER_THEME_COLOR,
    KEPT_WALLPAPERS,
    WALLPAPER_THEME_COLORS,
} from '../lib/wallpaperChrome'

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

    var colorMode = siteSettings.colorMode || preferredTheme || 'light'
    var theme = colorMode === 'system' ? (darkQuery.matches ? 'dark' : 'light') : (preferredTheme === 'system' ? (darkQuery.matches ? 'dark' : 'light') : preferredTheme)
    if (colorMode === 'light' || colorMode === 'dark') theme = colorMode
    var skin = siteSettings.skinMode || siteSettings.skin || 'modern'
    var wallpaper = siteSettings.wallpaper || ${JSON.stringify(DEFAULT_WALLPAPER)}
    var reduceTransparency = siteSettings.reduceTransparency ? 'true' : 'false'
    var THEME_COLORS = ${JSON.stringify(WALLPAPER_THEME_COLORS)}
    var KEPT = ${JSON.stringify(KEPT_WALLPAPERS)}
    if (KEPT.indexOf(wallpaper) === -1) wallpaper = ${JSON.stringify(DEFAULT_WALLPAPER)}

    function applyBrowserChrome(nextWallpaper, nextTheme, nextColorMode) {
        var head = document.head
        if (!head) return
        var pair = THEME_COLORS[nextWallpaper] || THEME_COLORS[${JSON.stringify(DEFAULT_WALLPAPER)}]
        var existing = head.querySelectorAll('meta[name="theme-color"]')
        for (var i = 0; i < existing.length; i++) existing[i].parentNode.removeChild(existing[i])
        function addThemeColor(content, media) {
            var meta = document.createElement('meta')
            meta.setAttribute('name', 'theme-color')
            meta.setAttribute('content', content)
            if (media) meta.setAttribute('media', media)
            head.appendChild(meta)
        }
        if (nextColorMode === 'system') {
            addThemeColor(pair.light, '(prefers-color-scheme: light)')
            addThemeColor(pair.dark, '(prefers-color-scheme: dark)')
        } else {
            addThemeColor(nextTheme === 'dark' ? pair.dark : pair.light)
        }
        var active = nextColorMode === 'system'
            ? (darkQuery.matches ? pair.dark : pair.light)
            : (nextTheme === 'dark' ? pair.dark : pair.light)
        var n = parseInt(String(active).replace('#', ''), 16)
        var lum = isNaN(n) ? 255 : (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000
        var bar = head.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
        if (!bar) {
            bar = document.createElement('meta')
            bar.setAttribute('name', 'apple-mobile-web-app-status-bar-style')
            head.appendChild(bar)
        }
        bar.setAttribute('content', lum < 150 ? 'black-translucent' : 'default')
        var nav = head.querySelector('meta[name="msapplication-navbutton-color"]')
        if (!nav) {
            nav = document.createElement('meta')
            nav.setAttribute('name', 'msapplication-navbutton-color')
            head.appendChild(nav)
        }
        nav.setAttribute('content', active)
    }

    function applyAttributes(el) {
        if (!el) return
        el.className = theme
        el.setAttribute('data-skin', skin)
        el.setAttribute('data-wallpaper', wallpaper)
        el.setAttribute('data-reduce-transparency', reduceTransparency)
    }

    window.__theme = theme
    if (document.documentElement) applyAttributes(document.documentElement)
    applyBrowserChrome(wallpaper, theme, colorMode)
    document.addEventListener('DOMContentLoaded', function () {
        if (document.body) applyAttributes(document.body)
        applyBrowserChrome(wallpaper, theme, colorMode)
    })

    window.__setPreferredTheme = function (newThemeChoice) {
        const nextTheme = newThemeChoice === 'system' ? (darkQuery.matches ? 'dark' : 'light') : newThemeChoice
        window.__theme = nextTheme
        if (document.documentElement) document.documentElement.className = nextTheme
        if (document.body) document.body.className = nextTheme
        colorMode = newThemeChoice === 'system' ? 'system' : nextTheme
        theme = nextTheme
        applyBrowserChrome(wallpaper, nextTheme, colorMode)
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

    if (typeof darkQuery.addEventListener === 'function') {
        darkQuery.addEventListener('change', function () {
            if (colorMode !== 'system') return
            var nextTheme = darkQuery.matches ? 'dark' : 'light'
            window.__theme = nextTheme
            theme = nextTheme
            if (document.documentElement) document.documentElement.className = nextTheme
            if (document.body) document.body.className = nextTheme
            applyBrowserChrome(wallpaper, nextTheme, 'system')
            window.__onThemeChange(nextTheme)
        })
    }
})()`

export default function Document() {
    return (
        <Html lang="en" className="light" suppressHydrationWarning>
            <Head>
                <meta charSet="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-visual"
                />
                <link rel="icon" href="/brand/wim-mark.png" type="image/png" />
                <link rel="apple-touch-icon" href="/brand/wim-mark.png" />
                <meta
                    name="theme-color"
                    media="(prefers-color-scheme: light)"
                    content={DEFAULT_WALLPAPER_THEME_COLOR.light}
                />
                <meta
                    name="theme-color"
                    media="(prefers-color-scheme: dark)"
                    content={DEFAULT_WALLPAPER_THEME_COLOR.dark}
                />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="color-scheme" content="light dark" />
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            </Head>
            <body data-scheme="primary" data-skin="modern" data-wallpaper="draft-world" suppressHydrationWarning>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}
