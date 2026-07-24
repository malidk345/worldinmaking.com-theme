const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: 'export',
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        unoptimized: true,
    },
    trailingSlash: false,
    reactStrictMode: false,
    experimental: {
        serverComponentsExternalPackages: ['kea'],
    },

    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            'gatsby$': path.resolve(__dirname, 'shims/gatsby.tsx'),
            gatsby: path.resolve(__dirname, 'shims/gatsby.tsx'),
            'gatsby-plugin-image': path.resolve(__dirname, 'shims/gatsby-plugin-image.tsx'),
            'gatsby-plugin-mdx': path.resolve(__dirname, 'shims/gatsby.tsx'),
            'gatsby-plugin-breakpoints': path.resolve(__dirname, 'shims/gatsby.tsx'),
            '@gatsbyjs/reach-router': path.resolve(__dirname, 'shims/reach-router.ts'),
            '@reach/router': path.resolve(__dirname, 'shims/reach-router.ts'),
            'debug': path.resolve(__dirname, 'shims/debug.js'),
            'supports-color': path.resolve(__dirname, 'shims/supports-color.js'),
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
        }

        config.resolve.fallback = {
            ...(config.resolve.fallback || {}),
            fs: false,
            path: false,
            os: false,
        }

        return config
    },
}

module.exports = nextConfig
