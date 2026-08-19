const path = require('path')
const webpack = require('webpack')

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: [
        'ai',
        '@ai-sdk/openai',
        '@ai-sdk/google',
        '@ai-sdk/provider',
        '@ai-sdk/provider-utils',
        '@codesandbox/sandpack-react',
        '@codesandbox/sandpack-client',
    ],
    eslint: { ignoreDuringBuilds: true },
    typescript: { ignoreBuildErrors: true },
    images: {
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [
            { protocol: 'https', hostname: 'res.cloudinary.com' },
            { protocol: 'https', hostname: 'user-images.githubusercontent.com' },
            { protocol: 'https', hostname: 'raw.githubusercontent.com' },
            { protocol: 'https', hostname: 'posthog.com' },
            { protocol: 'https', hostname: '*.posthog.com' },
            { protocol: 'https', hostname: '*.supabase.co' },
            { protocol: 'https', hostname: '*.supabase.in' },
        ],
    },
    trailingSlash: false,
    reactStrictMode: false,
    experimental: { serverComponentsExternalPackages: ['kea'] },

    webpack: (config) => {
        // ── Standard posthog.com aliases ──────────────────────────────────────────
        config.resolve.alias = {
            ...config.resolve.alias,
            debug: path.resolve(__dirname, 'shims/debug.js'),
            'supports-color': path.resolve(__dirname, 'shims/supports-color.js'),
            '@radix-ui/react-compose-refs$': path.resolve(__dirname, 'src/lib/stable-compose-refs.ts'),
            '@radix-ui/react-compose-refs': path.resolve(__dirname, 'src/lib/stable-compose-refs.ts'),
            components: path.resolve(__dirname, 'src/components'),
            hooks: path.resolve(__dirname, 'src/hooks'),
            context: path.resolve(__dirname, 'src/context'),
            lib: path.resolve(__dirname, 'src/lib'),
            utils: path.resolve(__dirname, 'src/utils.ts'),
            types: path.resolve(__dirname, 'src/types.ts'),
            constants: path.resolve(__dirname, 'src/constants'),
            logic: path.resolve(__dirname, 'src/logic'),
            data: path.resolve(__dirname, 'src/data'),
            menuItems: path.resolve(__dirname, 'src/menuItems'),
            navs: path.resolve(__dirname, 'src/navs'),
            sidebars: path.resolve(__dirname, 'src/sidebars'),

            // ── nb-lib: the notebook-app's own lib folder ─────────────────────────
            '~nb-lib': path.resolve(__dirname, 'src/notebook-app/lib'),
            // Full Lemon UI (notebook) available site-wide — use inside <LemonScope>
            '@posthog/lemon-ui': path.resolve(__dirname, 'src/notebook-app/lib/lemon-ui/index.ts'),
            // cva is safe to alias globally (not used by posthog.com itself)
            cva: 'class-variance-authority',
            '@posthog/quill/styles.css': path.resolve(__dirname, 'src/notebook-app/styles/quill-shim.css'),
            '@codesandbox/sandpack-react$': path.resolve(
                __dirname,
                'node_modules/@codesandbox/sandpack-react/dist/index.js'
            ),
        }

        // ── NormalModuleReplacementPlugin ─────────────────────────────────────────
        // Intercepts imports FROM notebook-app files only and redirects:
        //   lib/*        → src/notebook-app/lib/*  (via ~nb-lib alias)
        //   kea, kea-*   → src/notebook-app/lib/lemon-ui.tsx  (empty shim)
        //   scenes/*     → src/notebook-app/lib/lemon-ui.tsx
        //   posthog-js   → src/notebook-app/lib/lemon-ui.tsx
        //   ~/...        → src/notebook-app/lib/lemon-ui.tsx
        const nbShim    = path.resolve(__dirname, 'src/notebook-app/lib/lemon-ui.tsx')
        const nbLibPath = path.resolve(__dirname, 'src/notebook-app/lib')

        config.plugins.push(
            new webpack.NormalModuleReplacementPlugin(
                /./,
                (resource) => {
                    const issuer = (resource.contextInfo && resource.contextInfo.issuer) || ''
                    const ctx    = resource.context || ''
                    const isFromNotebookApp =
                        issuer.replace(/\\/g, '/').includes('notebook-app') ||
                        ctx.replace(/\\/g, '/').includes('notebook-app')

                    if (!isFromNotebookApp) return

                    const req = resource.request

                    // lib/* → ~nb-lib/*
                    if (req.startsWith('lib/')) {
                        resource.request = req.replace(/^lib\//, '~nb-lib/')
                        return
                    }

                    // kea, kea-loaders, kea-router, posthog-js, scenes/*, ~/* → shim
                    if (
                        req === 'kea' ||
                        req.startsWith('kea-') ||
                        req === 'posthog-js' ||
                        req.startsWith('scenes/') ||
                        req.startsWith('~/')
                    ) {
                        resource.request = nbShim
                        return
                    }

                    // @posthog/icons → iconsShim
                    // Exception: if the import is FROM iconsShim itself, let it resolve
                    // to the real package (so iconsShim can re-export real icons).
                    if (req === '@posthog/icons' || req.startsWith('@posthog/icons/')) {
                        const issuerNorm = issuer.replace(/\\/g, '/')
                        if (!issuerNorm.includes('iconsShim')) {
                            resource.request = path.resolve(__dirname, 'src/notebook-app/lib/icons/iconsShim.tsx')
                        }
                        return
                    }

                    // @posthog/lemon-ui → notebook-app lemon-ui index
                    if (req === '@posthog/lemon-ui' || req.startsWith('@posthog/lemon-ui/')) {
                        resource.request = path.resolve(__dirname, 'src/notebook-app/lib/lemon-ui/index.ts')
                        return
                    }

                    // @posthog/react, use-resize-observer, mermaid → shim
                    if (
                        req === '@posthog/react' ||
                        req === 'use-resize-observer' ||
                        req === 'mermaid'
                    ) {
                        resource.request = nbShim
                        return
                    }
                }
            )
        )

        config.module.rules.push({
            test: /\.(mp3|wav|m4a|ogg)$/i,
            type: 'asset/resource',
            generator: { filename: 'static/media/[name].[hash][ext]' },
        })

        config.resolve.fallback = {
            ...(config.resolve.fallback || {}),
            fs: false,
            path: false,
            os: false,
        }

        return config
    },

    async redirects() {
        return [
            { source: '/desktop', destination: '/', permanent: true },
            { source: '/home', destination: '/', permanent: true },
            { source: '/blog', destination: '/posts', permanent: true },
            { source: '/blog/:slug*', destination: '/posts/:slug*', permanent: true },
            { source: '/forum', destination: '/questions', permanent: true },
            { source: '/forum/:path*', destination: '/questions/:path*', permanent: true },
            { source: '/why', destination: '/about', permanent: true },
        ]
    },

    async rewrites() {
        return [
            { source: '/sitemap.xml', destination: '/api/seo/sitemap' },
            { source: '/feed.xml', destination: '/api/seo/rss' },
        ]
    },
}

module.exports = nextConfig
