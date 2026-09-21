(function () {
    window.__onThemeChange = function () {}
    function setTheme(newTheme) {
        window.__theme = newTheme
        preferredTheme = newTheme
        // Toggle only light/dark — do not wipe other body classes.
        if (document.body) {
            document.body.classList.remove('light', 'dark')
            document.body.classList.add(newTheme)
        }
        window.__onThemeChange(newTheme)
        applyBrowserChrome()
    }
    var preferredTheme
    var darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
    var colorMode = 'light'
    var wallpaper = 'keyboard-mint'
    // Tops = WALLPAPER_FIELDS.*.top (must match src/lib/wallpaperChrome.ts).
    // Legacy duplicate of _document.tsx boot — keep in sync for any static consumers.
    var THEME_COLORS = {
        cobalt: { light: '#2F7ED4', dark: '#1E5DAD' },
        hogzilla: { light: '#B4ADC4', dark: '#141E40' },
        'keyboard-mint': { light: '#4A8F7C', dark: '#2E6B5C' },
        'draft-world': { light: '#F3EFE6', dark: '#141E40' },
        'rain-embers': { light: '#1A3350', dark: '#0F2236' },
        'plaza-bang': { light: '#E6DFD2', dark: '#141E40' },
        'paper-white': { light: '#FFFFFF', dark: '#121212' },
    }
    var FIELDS = {
        cobalt: {
            light: { top: '#2F7ED4', bottom: '#5EB0F0', css: 'linear-gradient(180deg, #2F7ED4 0%, #4A9EE6 42%, #5EB0F0 100%)' },
            dark: { top: '#1E5DAD', bottom: '#3D8FDC', css: 'linear-gradient(180deg, #1E5DAD 0%, #2F7ED4 50%, #3D8FDC 100%)' },
        },
        hogzilla: {
            light: { top: '#B4ADC4', bottom: '#8B839C', css: 'linear-gradient(180deg, #B4ADC4 0%, #9E97AE 52%, #8B839C 100%)' },
            dark: { top: '#141E40', bottom: '#46368B', css: 'linear-gradient(180deg, #141E40 0%, #46368B 100%)' },
        },
        'keyboard-mint': {
            light: { top: '#4A8F7C', bottom: '#74B8A8', css: 'linear-gradient(180deg, #4A8F7C 0%, #5FA996 42%, #74B8A8 100%)' },
            dark: { top: '#2E6B5C', bottom: '#4E9A86', css: 'linear-gradient(180deg, #2E6B5C 0%, #3F8572 50%, #4E9A86 100%)' },
        },
        'draft-world': {
            light: { top: '#F3EFE6', bottom: '#DDD6C8', css: 'linear-gradient(180deg, #F3EFE6 0%, #E8E2D6 55%, #DDD6C8 100%)' },
            dark: { top: '#141E40', bottom: '#121A33', css: 'linear-gradient(180deg, #141E40 0%, #1A2748 55%, #121A33 100%)' },
        },
        'rain-embers': {
            light: { top: '#1A3350', bottom: '#163044', css: 'linear-gradient(180deg, #1A3350 0%, #23486A 52%, #163044 100%)' },
            dark: { top: '#0F2236', bottom: '#0C1A28', css: 'linear-gradient(180deg, #0F2236 0%, #17324A 50%, #0C1A28 100%)' },
        },
        'plaza-bang': {
            light: { top: '#E6DFD2', bottom: '#E6DFD2', css: '#E6DFD2' },
            dark: { top: '#141E40', bottom: '#141E40', css: '#141E40' },
        },
        'paper-white': {
            light: { top: '#FFFFFF', bottom: '#FFFFFF', css: '#FFFFFF' },
            dark: { top: '#121212', bottom: '#121212', css: '#121212' },
        },
    }
    var KEPT = ['keyboard-mint', 'cobalt', 'hogzilla', 'draft-world', 'rain-embers', 'plaza-bang', 'paper-white']

    function resolveWallpaper() {
        if (typeof window.__wallpaper === 'string' && KEPT.indexOf(window.__wallpaper) !== -1) {
            wallpaper = window.__wallpaper
            return wallpaper
        }
        var fromDom = document.documentElement && document.documentElement.getAttribute('data-wallpaper')
        if (fromDom && KEPT.indexOf(fromDom) !== -1) {
            wallpaper = fromDom
            window.__wallpaper = wallpaper
            return wallpaper
        }
        return wallpaper
    }

    window.__setWallpaper = function (next) {
        if (KEPT.indexOf(next) !== -1) {
            wallpaper = next
            window.__wallpaper = next
        }
    }

    function applyBrowserChrome() {
        var head = document.head
        if (!head) return
        wallpaper = resolveWallpaper()
        var pair = THEME_COLORS[wallpaper] || THEME_COLORS['keyboard-mint']
        var modes = FIELDS[wallpaper] || FIELDS['keyboard-mint']
        var theme = window.__theme === 'dark' ? 'dark' : 'light'
        var mode =
            colorMode === 'system'
                ? darkQuery.matches
                    ? 'dark'
                    : 'light'
                : theme === 'dark'
                  ? 'dark'
                  : 'light'
        var field = modes[mode] || { top: pair[mode], bottom: pair[mode], css: pair[mode] }
        var ua = navigator.userAgent || ''
        var overlay = /iP(hone|od|ad)/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        var chrome = overlay ? field.bottom : field.top
        if (document.documentElement) {
            document.documentElement.style.setProperty('--browser-chrome', field.top)
            document.documentElement.style.setProperty('--browser-chrome-bottom', field.bottom)
            document.documentElement.style.setProperty('--browser-chrome-field', field.css)
            document.documentElement.style.removeProperty('background-color')
            document.documentElement.setAttribute('data-wallpaper', wallpaper)
        }
        if (document.body) {
            document.body.style.removeProperty('background-color')
            document.body.setAttribute('data-wallpaper', wallpaper)
        }
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
    }

    darkQuery.addListener(function (e) {
        if (!localStorage.getItem('theme')) {
            window.__setPreferredTheme('system')
        }
    })
    try {
        preferredTheme =
            localStorage.getItem('theme') || 'light'
    } catch (err) {}
    window.__setPreferredTheme = function (theme) {
        const newTheme = theme === 'system' ? (darkQuery.matches ? 'dark' : 'light') : theme
        colorMode = theme === 'system' ? 'system' : newTheme
        setTheme(newTheme)
        try {
            // Persist the preference (including "system"), not only the resolved theme.
            localStorage.setItem('theme', theme === 'system' ? 'system' : newTheme)
        } catch (err) {}
        return newTheme
    }

    // Set initial skin / wallpaper / reduce-transparency before React hydrates
    try {
        // The classic skin has been retired; always render the modern skin
        document.body.setAttribute('data-skin', 'modern')
        var siteSettings = JSON.parse(localStorage.getItem('siteSettings') || '{}')
        var version = Number(siteSettings.siteDefaultsVersion || 0)
        if (version < 2) {
            if (!siteSettings.wallpaper || siteSettings.wallpaper === 'draft-world' || KEPT.indexOf(siteSettings.wallpaper) === -1) {
                siteSettings.wallpaper = 'keyboard-mint'
            }
            siteSettings.reduceTransparency = true
        }
        if (version < 3) {
            siteSettings.iconSet = 'pixel'
            siteSettings.siteDefaultsVersion = 3
            try { localStorage.setItem('siteSettings', JSON.stringify(siteSettings)) } catch (e) {}
        }
        wallpaper = siteSettings.wallpaper || 'keyboard-mint'
        if (KEPT.indexOf(wallpaper) === -1) wallpaper = 'keyboard-mint'
        window.__wallpaper = wallpaper
        colorMode = siteSettings.colorMode || preferredTheme || 'light'
        // Prefer stored colorMode when localStorage.theme was previously overwritten with resolved light/dark.
        if (siteSettings.colorMode === 'system' || siteSettings.colorMode === 'light' || siteSettings.colorMode === 'dark') {
            preferredTheme = siteSettings.colorMode
        }
        document.body.setAttribute('data-wallpaper', wallpaper)
        if (document.documentElement) document.documentElement.setAttribute('data-wallpaper', wallpaper)
        document.body.setAttribute('data-icon-set', siteSettings.iconSet === 'default' ? 'default' : 'pixel')
        document.body.setAttribute(
            'data-reduce-transparency',
            siteSettings.reduceTransparency === false ? 'false' : 'true'
        )
    } catch (err) {}

    setTheme(preferredTheme === 'system' ? (darkQuery.matches ? 'dark' : 'light') : preferredTheme)

    // Hide dismissed WarehouseWizardHint before first paint
    try {
        if (localStorage.getItem('warehouse-wizard-hint-dismissed') === '1') {
            document.documentElement.classList.add('warehouse-wizard-hint-dismissed')
        }
    } catch (err) {}
})()
