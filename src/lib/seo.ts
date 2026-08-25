/**
 * worldinmaking SEO helpers — one brand, lowercase titles, one host.
 */

export const SITE = {
    name: 'worldinmaking',
    url: 'https://worldinmaking.com',
    defaultTitle: 'worldinmaking',
    titleTemplate: '%s | worldinmaking',
    defaultDescription:
        'an open platform for essays, community discussion, markdown notebooks, and philosopher ai bots.',
    defaultImage: '/brand/wim-mark.png',
} as const

const SUFFIX_RE =
    /\s*(?:[-–—|:]\s*)?(?:posthog(?:\.com)?|worldinmaking(?:\s+os)?)\s*$/i

export function formatSeoTitle(raw?: string | null): string {
    const stripped = String(raw || '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(SUFFIX_RE, '')
        .trim()
        .toLocaleLowerCase('en-US')
    if (!stripped || stripped === SITE.name) return SITE.defaultTitle
    return SITE.titleTemplate.replace('%s', stripped)
}

export function formatSeoDescription(raw?: string | null, max = 160): string {
    const text = String(raw || SITE.defaultDescription)
        .replace(/\s+/g, ' ')
        .trim()
    if (text.length <= max) return text
    const slice = text.slice(0, max - 1)
    const lastSpace = slice.lastIndexOf(' ')
    return `${(lastSpace > 80 ? slice.slice(0, lastSpace) : slice).trim()}…`
}

export function canonicalPath(pathname?: string | null): string {
    if (!pathname) return '/'
    const path = String(pathname).split('?')[0].split('#')[0] || '/'
    if (path === '/') return '/'
    return path.replace(/\/+$/, '') || '/'
}

export function absoluteUrl(pathOrUrl?: string | null): string {
    const value = String(pathOrUrl || SITE.defaultImage).trim()
    if (/^https?:\/\//i.test(value)) {
        try {
            const url = new URL(value)
            if (url.hostname.endsWith('posthog.com')) {
                return `${SITE.url}${url.pathname}${url.search}`
            }
            return value
        } catch {
            return `${SITE.url}${SITE.defaultImage}`
        }
    }
    const path = value.startsWith('/') ? value : `/${value}`
    return `${SITE.url}${path}`
}

export function pageCanonical(pathname?: string | null): string {
    const path = canonicalPath(pathname)
    return path === '/' ? `${SITE.url}/` : `${SITE.url}${path}`
}

type JsonLd = Record<string, unknown>

export function buildWebSiteJsonLd(): JsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE.name,
        url: SITE.url,
        description: SITE.defaultDescription,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${SITE.url}/posts?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
        publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
    }
}

export function buildOrganizationJsonLd(): JsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE.name,
        url: SITE.url,
        logo: absoluteUrl(SITE.defaultImage),
    }
}

export function buildArticleJsonLd({
    title,
    description,
    url,
    image,
    datePublished,
    dateModified,
    author,
    keywords,
    wordCount,
}: {
    title: string
    description?: string
    url: string
    image?: string
    datePublished?: string
    dateModified?: string
    author?: string
    keywords?: string[]
    wordCount?: number
}): JsonLd {
    const data: JsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description: description || SITE.defaultDescription,
        url,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': url,
        },
        image: image ? [absoluteUrl(image)] : [absoluteUrl(SITE.defaultImage)],
        datePublished: datePublished || new Date().toISOString(),
        dateModified: dateModified || datePublished || new Date().toISOString(),
        author: author
            ? { '@type': 'Person', name: author, url: `${SITE.url}/community/profiles/${encodeURIComponent(author)}` }
            : { '@type': 'Organization', name: SITE.name, url: SITE.url },
        publisher: buildOrganizationJsonLd(),
        inLanguage: 'en',
    }
    if (keywords?.length) {
        data.keywords = keywords.join(', ')
    }
    if (typeof wordCount === 'number' && wordCount > 0) {
        data.wordCount = wordCount
    }
    return data
}

export function buildDiscussionJsonLd({
    title,
    description,
    url,
    datePublished,
    author,
    commentCount,
}: {
    title: string
    description?: string
    url: string
    datePublished?: string
    author?: string
    commentCount?: number
}): JsonLd {
    const data: JsonLd = {
        '@context': 'https://schema.org',
        '@type': 'DiscussionForumPosting',
        headline: title,
        text: description || title,
        url,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': url,
        },
        datePublished: datePublished || new Date().toISOString(),
        author: author
            ? { '@type': 'Person', name: author, url: `${SITE.url}/community/profiles/${encodeURIComponent(author)}` }
            : { '@type': 'Organization', name: SITE.name, url: SITE.url },
        publisher: buildOrganizationJsonLd(),
    }
    if (typeof commentCount === 'number') {
        data.interactionStatistic = {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/CommentAction',
            userInteractionCount: commentCount,
        }
    }
    return data
}

export function buildProfileJsonLd({
    username,
    name,
    bio,
    image,
    url,
}: {
    username: string
    name?: string
    bio?: string
    image?: string
    url: string
}): JsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: {
            '@type': 'Person',
            name: name || username,
            alternateName: username,
            description: bio || undefined,
            image: image ? absoluteUrl(image) : undefined,
            url,
        },
    }
}

export function buildBreadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: pageCanonical(item.path),
        })),
    }
}

export function buildAboutPageJsonLd(): JsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: 'about',
        url: pageCanonical('/about'),
        description: 'what this site is, and why it exists.',
        isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url },
    }
}

export function buildCollectionJsonLd(name: string, path: string, description?: string): JsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name,
        url: pageCanonical(path),
        description: description || SITE.defaultDescription,
        isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url },
    }
}

export function buildSoftwareApplicationJsonLd(): JsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'worldinmaking (wim)',
        alternateName: ['worldinmaking', 'wim', 'wim OS'],
        applicationCategory: 'NoteTakingApplication',
        operatingSystem: 'Web Browser, Any OS (macOS, Windows, Linux, iOS, Android)',
        url: SITE.url,
        description:
            'A sovereign spatial Web OS and AI-powered markdown notebook for unfinished thoughts, personal computing, resident philosopher co-authoring, live interactive artifacts, and public agora publishing.',
        creator: {
            '@type': 'Person',
            name: 'm. ali',
            url: `${SITE.url}/profile/ali`,
        },
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
        },
        featureList: [
            'Spatial Web OS Desktop Workspace with Draggable Multi-Windows',
            'AI Markdown Notebook with Live Typewriter Streaming & Co-Authoring',
            '16 Resident Philosopher AI Co-Authors (Marx, Nietzsche, Sartre, Deleuze, Spinoza, etc.)',
            'Bidirectional WikiLinks & Dynamic Backlinks Panel',
            'Hybrid Semantic & Vector Memory Search',
            'Live Interactive Artifacts (React TSX Sandboxes, JSON Charts, Markdown Docs)',
            'Public Agora & Community Symposium Discussions',
            'Offline-First Sync & Sovereign Personal Computing',
        ],
    }
}

export function toPlainText(raw?: string | null, max = 4000): string {
    const text = String(raw || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/[#>*_`~]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    if (text.length <= max) return text
    return `${text.slice(0, max - 1).trim()}…`
}

export const HOME_H1 = 'a world always making'
export const HOME_BODY =
    'an open platform for ideas and intellectual work — long-form essays, live community discussion, a markdown notebook, and ai philosopher bots that actually argue back.'
export const ABOUT_BODY =
    'worldinmaking is an open platform for ideas and intellectual work — long-form essays, live community discussion, a markdown notebook, and philosopher ai bots that actually argue back. the world is always in the process of being made. this site is a place for that process.'
