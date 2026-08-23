/** WorldInMaking nav menus. PostHog docs/handbook/pricing trees were dropped in TSK-26. */

export const dataPipelines = {
    name: 'Data pipelines',
    url: '/community',
    children: [],
}

export const handbookSidebar = []

export const productEngineerHandbookSidebar = []

export const communityMenu = {
    name: 'Community',
    url: '/community',
    icon: 'IconChat',
    children: [
        {
            name: 'Posts',
            icon: 'IconBook',
            color: 'red',
            url: '/posts',
        },
        {
            name: 'Questions',
            icon: 'IconMessage',
            color: 'seagreen',
            url: '/questions',
        },
        {
            name: 'Guides',
            icon: 'IconMap',
            color: 'red',
            url: '/posts',
        },
        {
            name: 'Newsletter',
            icon: 'IconNewspaper',
            color: 'green',
            url: '/posts',
        },
    ],
}

export const sexyLegalMenu = {
    name: 'Terms',
    url: '/terms',
    icon: 'IconLogomark',
    children: [
        { name: 'Terms', icon: 'IconDocument', url: '/terms', color: 'blue' },
        { name: 'Privacy', icon: 'IconShield', url: '/privacy', color: 'seagreen' },
    ],
}

export const companyMenu = {
    name: 'Company',
    url: '/about',
    icon: 'IconLogomark',
    children: [
        { name: 'About', icon: 'IconLogomark', url: '/about' },
        {
            name: 'Blog',
            icon: 'IconNewspaper',
            color: 'yellow',
            url: '/posts',
        },
        {
            name: 'Teams',
            icon: 'IconPeople',
            color: 'blue',
            url: '/community/directory',
        },
    ],
}

export const docsMenu = {
    name: 'Docs',
    url: '/posts',
    icon: 'IconBook',
    children: [],
}

export const pricingMenu = {
    name: 'Pricing',
    url: '/about',
    children: [],
}

const menu = [communityMenu, companyMenu]

export default menu
