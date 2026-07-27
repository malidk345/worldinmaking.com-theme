import { Html, Head, Main, NextScript } from 'next/document'

const themeScript = `(function () {
    window.__onThemeChange = function () {}
    function setTheme(newTheme) {
        window.__theme = newTheme
        if (document.body) document.body.className = newTheme
        if (document.documentElement) document.documentElement.className = newTheme
        window.__onThemeChange(newTheme)
    }
    var preferredTheme
    var darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
    try {
        preferredTheme = localStorage.getItem('theme') || 'light'
    } catch (err) {}
    window.__setPreferredTheme = function (theme) {
        const newTheme = theme === 'system' ? (darkQuery.matches ? 'dark' : 'light') : theme
        setTheme(newTheme)
        try {
            localStorage.setItem('theme', newTheme)
        } catch (err) {}
        return newTheme
    }
    setTheme(preferredTheme === 'system' ? (darkQuery.matches ? 'dark' : 'light') : preferredTheme)

    try {
        if (document.body) {
            document.body.setAttribute('data-skin', 'modern')
            var siteSettings = JSON.parse(localStorage.getItem('siteSettings') || '{}')
            document.body.setAttribute('data-wallpaper', siteSettings.wallpaper || 'keyboard-garden')
            document.body.setAttribute(
                'data-reduce-transparency',
                siteSettings.reduceTransparency ? 'true' : 'false'
            )
        }
    } catch (err) {}
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
