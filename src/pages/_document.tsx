import { Html, Head, Main, NextScript } from 'next/document'
import {
    DEFAULT_ICON_SET,
    DEFAULT_REDUCE_TRANSPARENCY,
    DEFAULT_WALLPAPER,
    KEPT_WALLPAPERS,
    SITE_APPEARANCE_DEFAULTS_VERSION,
    WALLPAPER_FIELDS,
    WALLPAPER_THEME_COLORS,
} from '../lib/wallpaperChrome'

const themeScript = `(function () {
    window.__onThemeChange = function () {}
    var preferredTheme
    var siteSettings = {}
    var darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
    try {
        preferredTheme = localStorage.getItem('theme') || 'light'
    } catch (err) {/* ignore */ }
    try {
        siteSettings = JSON.parse(localStorage.getItem('siteSettings') || '{}')
    } catch (err) {/* ignore */ }

    var colorMode = siteSettings.colorMode || preferredTheme || 'light'
    var theme = colorMode === 'system' ? (darkQuery.matches ? 'dark' : 'light') : (preferredTheme === 'system' ? (darkQuery.matches ? 'dark' : 'light') : preferredTheme)
    if (colorMode === 'light' || colorMode === 'dark') theme = colorMode
    var skin = siteSettings.skinMode || siteSettings.skin || 'modern'
    var DEFAULT_WALLPAPER = ${JSON.stringify(DEFAULT_WALLPAPER)}
    var DEFAULT_ICON_SET = ${JSON.stringify(DEFAULT_ICON_SET)}
    var KEPT = ${JSON.stringify(KEPT_WALLPAPERS)}
    var DEFAULTS_VERSION = ${JSON.stringify(SITE_APPEARANCE_DEFAULTS_VERSION)}
    var version = Number(siteSettings.siteDefaultsVersion || 0)
    if (version < 2) {
        if (!siteSettings.wallpaper || siteSettings.wallpaper === 'draft-world' || KEPT.indexOf(siteSettings.wallpaper) === -1) {
            siteSettings.wallpaper = DEFAULT_WALLPAPER
        }
        siteSettings.reduceTransparency = ${JSON.stringify(DEFAULT_REDUCE_TRANSPARENCY)}
    }
    if (version < 3) {
        siteSettings.iconSet = DEFAULT_ICON_SET
    }
    if (version < DEFAULTS_VERSION) {
        siteSettings.siteDefaultsVersion = DEFAULTS_VERSION
        try { localStorage.setItem('siteSettings', JSON.stringify(siteSettings)) } catch (err) {/* ignore */ }
    }
    var wallpaper = siteSettings.wallpaper || DEFAULT_WALLPAPER
    var iconSet = siteSettings.iconSet === 'default' ? 'default' : DEFAULT_ICON_SET
    var reduceTransparency = siteSettings.reduceTransparency === false ? 'false' : 'true'
    var THEME_COLORS = ${JSON.stringify(WALLPAPER_THEME_COLORS)}
    var FIELDS = ${JSON.stringify(WALLPAPER_FIELDS)}
    if (KEPT.indexOf(wallpaper) === -1) wallpaper = DEFAULT_WALLPAPER

    function applyBrowserChrome(nextWallpaper, nextTheme, nextColorMode) {
        var head = document.head
        if (!head) return
        var pair = THEME_COLORS[nextWallpaper] || THEME_COLORS[${JSON.stringify(DEFAULT_WALLPAPER)}]
        var modes = FIELDS[nextWallpaper] || FIELDS[${JSON.stringify(DEFAULT_WALLPAPER)}]
        var mode = nextColorMode === 'system'
            ? (darkQuery.matches ? 'dark' : 'light')
            : (nextTheme === 'dark' ? 'dark' : 'light')
        var active = mode === 'dark' ? pair.dark : pair.light
        var field = modes[mode] || { top: active, bottom: active, css: active }
        var ua = navigator.userAgent || ''
        var overlay = /iP(hone|od|ad)/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        var chrome = overlay ? field.bottom : field.top
        var root = document.documentElement
        if (root) {
            root.style.setProperty('--browser-chrome', field.top)
            root.style.setProperty('--browser-chrome-bottom', field.bottom)
            root.style.setProperty('--browser-chrome-field', field.css)
            root.style.removeProperty('background-color')
        }
        if (document.body) document.body.style.removeProperty('background-color')
        var metas = head.querySelectorAll('meta[name="theme-color"]')
        var keep = metas[0]
        if (!keep) {
            keep = document.createElement('meta')
            keep.setAttribute('name', 'theme-color')
            head.appendChild(keep)
        }
        keep.removeAttribute('media')
        keep.setAttribute('content', chrome)
        for (var i = 1; i < metas.length; i++) metas[i].parentNode.removeChild(metas[i])
        var n = parseInt(String(field.top).replace('#', ''), 16)
        var lum = isNaN(n) ? 255 : (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000
        var bar = head.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
        if (!bar) {
            bar = document.createElement('meta')
            bar.setAttribute('name', 'apple-mobile-web-app-status-bar-style')
            head.appendChild(bar)
        }
        bar.setAttribute('content', overlay || lum < 150 ? 'black-translucent' : 'default')
        var nav = head.querySelector('meta[name="msapplication-navbutton-color"]')
        if (!nav) {
            nav = document.createElement('meta')
            nav.setAttribute('name', 'msapplication-navbutton-color')
            head.appendChild(nav)
        }
        nav.setAttribute('content', field.bottom)
    }

    function applyAttributes(el) {
        if (!el) return
        el.className = theme
        el.setAttribute('data-skin', skin)
        el.setAttribute('data-wallpaper', wallpaper)
        el.setAttribute('data-icon-set', iconSet)
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
        } catch (err) {/* ignore */ }
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
                    content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=overlays-content"
                />
                <link rel="icon" href="/brand/wim-mark.png" type="image/png" />
                <link rel="apple-touch-icon" href="/brand/wim-mark.png" />
                <link rel="manifest" href="/manifest.webmanifest" />
                <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://res.cloudinary.com" />
                <link rel="preconnect" href="https://us.i.posthog.com" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://us.i.posthog.com" />
                <link rel="preconnect" href="https://eu.i.posthog.com" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://eu.i.posthog.com" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="application-name" content="worldinmaking" />
                <meta name="color-scheme" content="light dark" />
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            </Head>
            <body data-scheme="primary" data-skin="modern" data-wallpaper={DEFAULT_WALLPAPER} data-icon-set={DEFAULT_ICON_SET} data-reduce-transparency="true" suppressHydrationWarning>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}
