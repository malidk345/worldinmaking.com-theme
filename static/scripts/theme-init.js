(function () {
    window.__onThemeChange = function () {}
    function setTheme(newTheme) {
        window.__theme = newTheme
        preferredTheme = newTheme
        document.body.className = newTheme
        window.__onThemeChange(newTheme)
        applyBrowserChrome()
    }
    var preferredTheme
    var darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
    var colorMode = 'light'
    var wallpaper = 'draft-world'
    var THEME_COLORS = {
        cobalt: { light: '#2F7ED4', dark: '#1E5DAD' },
        hogzilla: { light: '#E3E1E4', dark: '#141E40' },
        'draft-world': { light: '#F3EFE6', dark: '#141E40' },
        'rain-embers': { light: '#1A3350', dark: '#0F2236' },
        'plaza-bang': { light: '#E6DFD2', dark: '#141E40' },
    }
    var KEPT = ['cobalt', 'hogzilla', 'draft-world', 'rain-embers', 'plaza-bang']

    function applyBrowserChrome() {
        var head = document.head
        if (!head) return
        var pair = THEME_COLORS[wallpaper] || THEME_COLORS['draft-world']
        var theme = window.__theme === 'dark' ? 'dark' : 'light'
        var existing = head.querySelectorAll('meta[name="theme-color"]')
        for (var i = 0; i < existing.length; i++) existing[i].parentNode.removeChild(existing[i])
        function addThemeColor(content, media) {
            var meta = document.createElement('meta')
            meta.setAttribute('name', 'theme-color')
            meta.setAttribute('content', content)
            if (media) meta.setAttribute('media', media)
            head.appendChild(meta)
        }
        if (colorMode === 'system') {
            addThemeColor(pair.light, '(prefers-color-scheme: light)')
            addThemeColor(pair.dark, '(prefers-color-scheme: dark)')
        } else {
            addThemeColor(theme === 'dark' ? pair.dark : pair.light)
        }
        var active =
            colorMode === 'system'
                ? darkQuery.matches
                    ? pair.dark
                    : pair.light
                : theme === 'dark'
                  ? pair.dark
                  : pair.light
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
            localStorage.setItem('theme', newTheme)
        } catch (err) {}
        return newTheme
    }

    // Set initial skin / wallpaper / reduce-transparency before React hydrates
    try {
        // The classic skin has been retired; always render the modern skin
        document.body.setAttribute('data-skin', 'modern')
        var siteSettings = JSON.parse(localStorage.getItem('siteSettings') || '{}')
        wallpaper = siteSettings.wallpaper || 'draft-world'
        if (KEPT.indexOf(wallpaper) === -1) wallpaper = 'draft-world'
        colorMode = siteSettings.colorMode || preferredTheme || 'light'
        document.body.setAttribute('data-wallpaper', wallpaper)
        document.body.setAttribute(
            'data-reduce-transparency',
            siteSettings.reduceTransparency ? 'true' : 'false'
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
