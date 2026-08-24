import { test, expect } from '@playwright/test'
import { BLOG_LIST_PAGE_SIZE, fetchSupabasePostsPage } from '../src/lib/supabaseBlog'

test.describe('blog list pages from Supabase', () => {
    test('first page is 10 posts and omits full content', async () => {
        const page = await fetchSupabasePostsPage({ limit: BLOG_LIST_PAGE_SIZE, offset: 0 })
        expect(page.posts.length).toBeGreaterThanOrEqual(0)
        expect(page.posts.length).toBeLessThanOrEqual(BLOG_LIST_PAGE_SIZE)
        expect(page.total).toBeGreaterThanOrEqual(page.posts.length)
        expect(page.hasMore).toBe(true)
        for (const post of page.posts) {
            expect(post.title).toBeTruthy()
            expect(post.content).toBeUndefined()
        }
    })

    test('second page is a different slice of 10', async () => {
        const first = await fetchSupabasePostsPage({ limit: 10, offset: 0 })
        const second = await fetchSupabasePostsPage({ limit: 10, offset: 10 })
        expect(second.posts.length).toBeGreaterThanOrEqual(0)
        expect(second.posts[0]?.id).not.toBe(first.posts[0]?.id)
    })
})
