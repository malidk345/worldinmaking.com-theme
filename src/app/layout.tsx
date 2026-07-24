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

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                {/* Theme init script matching PostHog's original html.tsx & theme-init.js */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    var siteSettings = JSON.parse(localStorage.getItem('siteSettings') || '{}');
                                    var theme = localStorage.getItem('theme') || siteSettings.colorMode || 'light';
                                    var wallpaper = siteSettings.wallpaper || 'keyboard-garden';
                                    var reduceTrans = String(siteSettings.reduceTransparency || 'false');
                                    var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                                    var themeClass = isDark ? 'dark' : 'light';
                                    document.documentElement.className = themeClass;
                                    window.__theme = themeClass;
                                } catch(e) {
                                    document.documentElement.className = 'light';
                                }
                            })();
                        `,
                    }}
                />
            </head>
            <body className="light" data-wallpaper="keyboard-garden" data-reduce-transparency="false">
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
