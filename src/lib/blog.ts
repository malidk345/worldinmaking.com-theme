import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const BLOG_DIR = typeof process !== 'undefined' && process.cwd ? path.join(process.cwd(), 'contents', 'blog') : ''

export interface BlogPost {
    slug: string
    title: string
    date: string
    author: string[]
    tags: string[]
    description?: string
}

const STATIC_BLOG_POSTS: BlogPost[] = [
    {
        slug: 'why-os',
        title: 'Why we built Hedgehog OS',
        date: '2026-01-15',
        author: ['James Hawkins'],
        tags: ['Engineering', 'PostHog'],
        description: 'Building an operating system for product analytics and developer tools.',
    },
    {
        slug: 'product-analytics-guide',
        title: 'Complete Guide to Product Analytics for Engineers',
        date: '2026-01-10',
        author: ['Tim Glaser'],
        tags: ['Guides', 'Analytics'],
        description: 'How to instrument events, build funnels, and analyze user retention.',
    },
    {
        slug: 'feature-flags-best-practices',
        title: 'Feature Flags Best Practices at Scale',
        date: '2026-01-05',
        author: ['Marcus Hyett'],
        tags: ['Feature Flags', 'DevOps'],
        description: 'Safely rolling out features to millions of users with zero downtime.',
    },
    {
        slug: 'session-replay-architecture',
        title: 'How PostHog Replays Millions of User Sessions',
        date: '2025-12-28',
        author: ['Ben White'],
        tags: ['Engineering', 'Session Replay'],
        description: 'A deep dive into DOM snapshotting and compressed replay streams.',
    },
    {
        slug: 'data-warehouse-launches',
        title: 'PostHog Data Warehouse is Now Generally Available',
        date: '2025-12-15',
        author: ['Lottie Coxon'],
        tags: ['Product', 'Data Warehouse'],
        description: 'Query your S3, Snowflake, and Postgres data right inside PostHog.',
    },
]

export function getAllBlogPosts(): BlogPost[] {
    if (typeof window !== 'undefined' || !fs || !fs.existsSync || !BLOG_DIR) {
        return STATIC_BLOG_POSTS
    }

    try {
        if (!fs.existsSync(BLOG_DIR)) return STATIC_BLOG_POSTS

        const files = fs
            .readdirSync(BLOG_DIR)
            .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
            .slice(0, 5)

        const posts: BlogPost[] = files
            .map((file) => {
                const slug = file.replace(/\.(md|mdx)$/, '')
                const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8')
                const { data } = matter(raw)
                return {
                    slug,
                    title: data.title || slug,
                    date: data.date ? String(data.date) : '',
                    author: Array.isArray(data.author) ? data.author : data.author ? [data.author] : [],
                    tags: Array.isArray(data.tags) ? data.tags : [],
                    description: data.description || null,
                }
            })
            .filter((p) => p.title)

        return posts.length > 0 ? posts : STATIC_BLOG_POSTS
    } catch (e) {
        return STATIC_BLOG_POSTS
    }
}

export function getBlogPost(slug: string): { frontmatter: Record<string, any>; content: string } | null {
    if (typeof window !== 'undefined' || !fs || !fs.existsSync || !BLOG_DIR) {
        const found = STATIC_BLOG_POSTS.find((p) => p.slug === slug) || STATIC_BLOG_POSTS[0]
        return {
            frontmatter: found,
            content: `# ${found.title}\n\n${found.description}\n\nThis post demonstrates PostHog's clean text-only blog rendering.`,
        }
    }

    try {
        const possibleFiles = [
            path.join(BLOG_DIR, `${slug}.mdx`),
            path.join(BLOG_DIR, `${slug}.md`),
        ]
        for (const filePath of possibleFiles) {
            if (fs.existsSync(filePath)) {
                const raw = fs.readFileSync(filePath, 'utf8')
                const { data, content } = matter(raw)
                return { frontmatter: data, content }
            }
        }
    } catch (e) {}

    const found = STATIC_BLOG_POSTS[0]
    return {
        frontmatter: found,
        content: `# ${found.title}\n\n${found.description}`,
    }
}
