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

const STATIC_BLOG_POSTS: BlogPost[] = []

export function getAllBlogPosts(): BlogPost[] {
    if (typeof window !== 'undefined' || !fs || !fs.existsSync || !BLOG_DIR) {
        return []
    }

    try {
        if (!fs.existsSync(BLOG_DIR)) return []

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
        const title = slug ? slug.replace(/-/g, ' ') : 'Post'
        return {
            frontmatter: { title, date: '', author: ['WorldInMaking'], tags: [] },
            content: `# ${title}\n\nLoading content...`,
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

    const title = slug ? slug.replace(/-/g, ' ') : 'Post'
    return {
        frontmatter: { title, date: '', author: ['WorldInMaking'], tags: [] },
        content: `# ${title}\n\nLoading content...`,
    }
}
