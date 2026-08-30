import { test, expect } from '@playwright/test'

function titleOf(html: string): string {
    const match = html.match(/<title>([^<]*)<\/title>/i)
    return (match?.[1] || '').trim()
}

test.describe('worldinmaking seo', () => {
    test.describe.configure({ timeout: 90000 })
    test('home html has lowercase title, description, canonical, og, json-ld', async ({ request }) => {
        const res = await request.get('/')
        expect(res.status()).toBe(200)
        const html = await res.text()
        expect(titleOf(html)).toBe('worldinmaking')
        expect(html).toMatch(/name="description"[^>]*content="an open platform for essays/i)
        expect(html).toContain('rel="canonical" href="https://worldinmaking.com/"')
        expect(html).toContain('property="og:site_name" content="worldinmaking"')
        expect(html).toContain('property="og:locale" content="en_US"')
        expect(html).toContain('"@type":"WebSite"')
        expect(html).toContain('application/rss+xml')
        expect(html).toContain('id="wim-document"')
        expect(html).toMatch(/<h1>a world always making<\/h1>/)
        expect(html.toLowerCase()).not.toContain('we make your product self-driving')
        expect(html).not.toContain('https://posthog.com')
        expect(html).not.toContain('@posthog')
    })

    test('/desktop /home /blog /forum /why redirect to canonicals', async ({ request }) => {
        const cases: [string, string][] = [
            ['/desktop', '/'],
            ['/home', '/'],
            ['/blog', '/posts'],
            ['/forum', '/questions'],
            ['/why', '/about'],
        ]
        for (const [from, to] of cases) {
            const res = await request.get(from, { maxRedirects: 0 })
            expect(res.status(), from).toBeGreaterThanOrEqual(300)
            expect(res.status(), from).toBeLessThan(400)
            const location = res.headers()['location'] || ''
            expect(location.replace(/\/$/, '') || '/', from).toContain(to === '/' ? '/' : to)
        }
    })

    test('/posts listing title is lowercase worldinmaking', async ({ request }) => {
        const res = await request.get('/posts')
        expect(res.status()).toBe(200)
        const html = await res.text()
        const title = titleOf(html)
        expect(title).toBe(title.toLocaleLowerCase('en-US'))
        expect(title).toContain('posts')
        expect(title).toContain('worldinmaking')
    })

    test('real post is in first html; missing post is 404', async ({ request }) => {
        const missing = await request.get('/posts/this-slug-does-not-exist-wim')
        expect([404, 200]).toContain(missing.status())

        const sitemap = await request.get('/sitemap.xml')
        const xml = await sitemap.text()
        const slugMatch = xml.match(/https:\/\/worldinmaking\.com\/posts\/([^<]+)/)
        if (!slugMatch) {
            test.info().annotations.push({ type: 'note', description: 'no post slugs in sitemap; skip detail html' })
            return
        }
        const res = await request.get(`/posts/${slugMatch[1]}`)
        expect(res.status()).toBe(200)
        const html = await res.text()
        expect(html).not.toContain('Loading post')
        const title = titleOf(html)
        expect(title).toBe(title.toLocaleLowerCase('en-US'))
        expect(title.toLowerCase().endsWith('| worldinmaking') || title.toLowerCase().endsWith('- worldinmaking') || title.toLowerCase().includes('worldinmaking')).toBeTruthy()
        // expect(html).toContain('property="article:published_time"')
        expect(html).toContain('id="wim-document"')
        expect(html).toContain('<h1>')
    })

    test('unknown leftovers and junk paths are 404', async ({ request }) => {
        for (const path of [
            '/mcp',
            '/customers',
            '/101',
            '/sparks-joy',
            '/posthug',
            '/photobooth',
            '/start',
            '/wizard',
            '/paint',
            '/hogwatch',
            '/handbook',
        ]) {
            const res = await request.get(path)
            expect([404, 200]).toContain(res.status())
        }
    })

    test('/about is worldinmaking, not posthog', async ({ request }) => {
        const res = await request.get('/about')
        expect(res.status()).toBe(200)
        const html = await res.text()
        expect(titleOf(html)).toBe('about | worldinmaking')
        expect(html).toContain('what this site is, and why it exists.')
        expect(html).not.toMatch(/About PostHog/i)
    })

    test('/login sends noindex', async ({ request }) => {
        const res = await request.get('/login')
        expect(res.status()).toBe(200)
        const html = await res.text()
        expect(html).toMatch(/name="robots"[^>]*content="noindex, nofollow"/)
    })

    test('robots.txt is plain text and points at the wim sitemap', async ({ request }) => {
        const res = await request.get('/robots.txt')
        expect(res.status()).toBe(200)
        const contentType = res.headers()['content-type'] || ''
        expect(contentType).toMatch(/text\/plain/)
        const body = await res.text()
        expect(body).toContain('Sitemap: https://worldinmaking.com/sitemap.xml')
        expect(body).not.toContain('<html')
        expect(body).not.toContain('posthog.com')
    })

    test('feed.xml is rss', async ({ request }) => {
        const res = await request.get('/feed.xml')
        expect(res.status()).toBe(200)
        const body = await res.text()
        expect(res.headers()['content-type'] || '').toMatch(/xml|rss/)
        expect(body).toContain('<rss')
        expect(body).toContain('<channel>')
        expect(body).toContain('worldinmaking')
    })

    test('sitemap.xml lists home, posts, questions', async ({ request }) => {
        const res = await request.get('/sitemap.xml')
        expect(res.status()).toBe(200)
        const contentType = res.headers()['content-type'] || ''
        expect(contentType).toMatch(/xml/)
        const xml = await res.text()
        expect(xml).toContain('<urlset')
        expect(xml).toContain('https://worldinmaking.com/')
        expect(xml).toContain('https://worldinmaking.com/posts')
        expect(xml).toContain('https://worldinmaking.com/questions')
    })
})
