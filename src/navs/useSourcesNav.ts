import { SELF_HOSTED_SOURCES } from '../constants/sources'

const MANAGED_SOURCES = [
    { slug: 'postgres', name: 'PostgreSQL', beta: false },
    { slug: 'stripe', name: 'Stripe', beta: false },
    { slug: 'hubspot', name: 'HubSpot', beta: false },
    { slug: 'zendesk', name: 'Zendesk', beta: false },
]

export default function useSourcesNav(basePath = '/docs/data-warehouse/sources'): { url?: string; name: string }[] {
    const managed = MANAGED_SOURCES.map((node) => ({
        url: `${basePath}/${node.slug}`,
        name: node.name,
        ...(node.beta && {
            badge: {
                title: 'Beta',
                className: '!bg-blue/10 !text-blue !dark:text-white !dark:bg-blue/50',
            },
        }),
    }))

    const selfManaged = (SELF_HOSTED_SOURCES || []).map((s) => ({
        name: s.name,
        url: `${basePath}/${s.slug}`,
    }))

    return [...managed, { name: 'Self-managed' }, ...selfManaged]
}
