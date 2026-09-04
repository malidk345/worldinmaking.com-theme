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
    var THEME_COLORS = {
        cobalt: { light: '#2F7ED4', dark: '#1E5DAD' },
        hogzilla: { light: '#E3E1E4', dark: '#141E40' },
        'keyboard-mint': { light: '#C9D0BE', dark: '#141E18' },
        'draft-world': { light: '#F3EFE6', dark: '#141E40' },
        'rain-embers': { light: '#1A3350', dark: '#0F2236' },
        'plaza-bang': { light: '#E6DFD2', dark: '#141E40' },
    }
    var KEPT = ['keyboard-mint', 'cobalt', 'hogzilla', 'draft-world', 'rain-embers', 'plaza-bang']

    function applyBrowserChrome() {
        var head = document.head
        if (!head) return
        var pair = THEME_COLORS[wallpaper] || THEME_COLORS['keyboard-mint']
        var theme = window.__theme === 'dark' ? 'dark' : 'light'
        var active =
            colorMode === 'system'
                ? darkQuery.matches
                    ? pair.dark
                    : pair.light
                : theme === 'dark'
                  ? pair.dark
                  : pair.light
        if (document.documentElement) {
            document.documentElement.style.setProperty('--browser-chrome', active)
            document.documentElement.style.backgroundColor = active
        }
        if (document.body) document.body.style.backgroundColor = active
        var metas = head.querySelectorAll('meta[name="theme-color"]')
        var keep = metas[0]
        if (!keep) {
            keep = document.createElement('meta')
            keep.setAttribute('name', 'theme-color')
            head.appendChild(keep)
        }
        keep.removeAttribute('media')
        keep.setAttribute('content', active)
        for (var i = 1; i < metas.length; i++) metas[i].parentNode.removeChild(metas[i])
        var n = parseInt(String(active).replace('#', ''), 16)
        var lum = isNaN(n) ? 255 : (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000
        var bar = head.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
        if (!bar) {
            bar = document.createElement('meta')
            bar.setAttribute('name', 'apple-mobile-web-app-status-bar-style')
            head.appendChild(bar)
        }
        bar.setAttribute('content', lum < 150 ? 'black-translucent' : 'default')
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
            siteSettings.siteDefaultsVersion = 2
            try { localStorage.setItem('siteSettings', JSON.stringify(siteSettings)) } catch (e) {}
        }
        wallpaper = siteSettings.wallpaper || 'keyboard-mint'
        if (KEPT.indexOf(wallpaper) === -1) wallpaper = 'keyboard-mint'
        colorMode = siteSettings.colorMode || preferredTheme || 'light'
        // Prefer stored colorMode when localStorage.theme was previously overwritten with resolved light/dark.
        if (siteSettings.colorMode === 'system' || siteSettings.colorMode === 'light' || siteSettings.colorMode === 'dark') {
            preferredTheme = siteSettings.colorMode
        }
        document.body.setAttribute('data-wallpaper', wallpaper)
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
