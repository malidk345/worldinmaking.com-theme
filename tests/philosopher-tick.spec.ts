import { test, expect } from '@playwright/test'
import {
    FALLBACK_TOPICS,
    fetchRSSTopic,
    parseTickRequest,
    pickBot,
    titlesFromRssXml,
} from '../src/lib/bots/philosopher-tick'
import { FORUM_OPEN_INSTRUCTION, FORUM_REPLY_INSTRUCTION } from '../src/lib/bots/forum-thread'
import { clipForumTitle, instructionForForumMove, pickForumMove } from '../src/lib/bots/forum-moves'
import { buildPersonaHeader, extractPersona } from '../src/lib/persona-engine'
import { formatRssBriefing, itemsFromFeedXml } from '../src/lib/bots/forum-rss'
import { formatForumTranscript, shouldContinueThread } from '../src/lib/bots/forum-thread'

test.describe('philosopher hourly tick helpers', () => {
    test('parseTickRequest defaults to a full tick', () => {
        expect(parseTickRequest(null).phase).toBe('full')
        expect(parseTickRequest('nope').phase).toBe('full')
        expect(parseTickRequest({}).phase).toBe('full')
    })

    test('parseTickRequest accepts topic/reply and ignores junk ids', () => {
        expect(parseTickRequest({ phase: 'topic' }).phase).toBe('topic')
        expect(parseTickRequest({ phase: 'REPLY', topicId: '42' })).toEqual({
            phase: 'reply',
            topicId: '42',
            topicTitle: undefined,
            postBot: undefined,
            replyBot: undefined,
        })
        expect(parseTickRequest({ phase: 'reply', topic_id: 'abc' }).topicId).toBeUndefined()
        const url = new URL('https://worldinmaking.com/api/cron/philosopher-bots?phase=topic')
        expect(parseTickRequest({}, url).phase).toBe('topic')
    })

    test('pickBot never returns the excluded voice', () => {
        for (let i = 0; i < 20; i++) {
            expect(pickBot('nietzsche').toLowerCase()).not.toBe('nietzsche')
        }
        for (let i = 0; i < 20; i++) {
            expect(['nietzsche', 'marx']).not.toContain(pickBot(['nietzsche', 'marx']).toLowerCase())
        }
    })

    test('titlesFromRssXml skips the channel title and junk labels', () => {
        const xml = `
          <rss><channel>
            <title>Aeon RSS</title>
            <item><title>Why machines cannot want anything real</title></item>
            <item><title><![CDATA[A longer essay about freedom and software]]></title></item>
            <item><title>Hi</title></item>
          </channel></rss>
        `
        expect(titlesFromRssXml(xml)).toEqual([
            'Why machines cannot want anything real',
            'A longer essay about freedom and software',
        ])
    })

    test('fetchRSSTopic falls back when every feed fails inside the budget', async () => {
        const original = globalThis.fetch
        globalThis.fetch = async () => {
            throw new Error('blocked')
        }
        try {
            const title = await fetchRSSTopic(150)
            expect(FALLBACK_TOPICS).toContain(title)
        } finally {
            globalThis.fetch = original
        }
    })

    test('fetchRSSTopic uses the first successful feed and does not wait out dead ones', async () => {
        const original = globalThis.fetch
        globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input)
            if (url.includes('aeon.co')) {
                return new Response(
                    `<rss><channel><title>Feed</title><item><title>An essay about technological destiny and agency</title></item></channel></rss>`,
                    { status: 200 }
                )
            }
            await new Promise<void>((_resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('slow')), 5_000)
                const abort = () => {
                    clearTimeout(timer)
                    reject(new DOMException('The operation was aborted.', 'AbortError'))
                }
                if (init?.signal?.aborted) {
                    abort()
                    return
                }
                init?.signal?.addEventListener('abort', abort, { once: true })
            })
            throw new Error('slow')
        }
        try {
            const started = Date.now()
            const title = await fetchRSSTopic(400)
            expect(title).toBe('An essay about technological destiny and agency')
            expect(Date.now() - started).toBeLessThan(1500)
        } finally {
            globalThis.fetch = original
        }
    })

    test('itemsFromFeedXml keeps excerpt and link from RSS items', () => {
        const xml = `
          <rss><channel>
            <title>Aeon</title>
            <item>
              <title>Why machines cannot want anything real</title>
              <link>https://aeon.co/essays/machines</link>
              <description><![CDATA[<p>Desire is not a loss function.</p>]]></description>
            </item>
          </channel></rss>
        `
        expect(itemsFromFeedXml(xml, 'aeon.co')).toEqual([
            {
                title: 'Why machines cannot want anything real',
                source: 'aeon.co',
                link: 'https://aeon.co/essays/machines',
                excerpt: 'Desire is not a loss function.',
            },
        ])
    })

    test('forum instructions stay on the situation without citation theater', () => {
        expect(FORUM_OPEN_INSTRUCTION).toMatch(/private memo/)
        expect(FORUM_OPEN_INSTRUCTION).toMatch(/4–10 ordinary words/)
        expect(FORUM_OPEN_INSTRUCTION).toMatch(/set the situation/)
        expect(FORUM_OPEN_INSTRUCTION).toMatch(/Be yourself/)
        expect(FORUM_OPEN_INSTRUCTION).not.toMatch(/source, headline/)
        expect(FORUM_REPLY_INSTRUCTION).toMatch(/Do not file a response/)
        expect(FORUM_REPLY_INSTRUCTION).toMatch(/Be yourself/)
        expect(FORUM_OPEN_INSTRUCTION).toMatch(/not a standing duty/)
        expect(instructionForForumMove('distinguish')).toMatch(/distinction/)
        expect(pickForumMove(0)).toBe('counter')
        expect(pickForumMove(1)).toBe('distinguish')
        expect(pickForumMove(2)).toBe('press')
        expect(pickForumMove(4)).toBe('close')
        const clipped = clipForumTitle(
            'A New Axial Age? The Berggruen Prize Question Noema magazine has announced the 2026 topic in full'
        )
        expect(clipped).toBe('A New Axial Age?')
        expect(clipped).not.toMatch(/Noema/)

        const header = buildPersonaHeader(extractPersona('', 'Nietzsche'), 'passionate', 'community_reply')
        expect(header).toMatch(/slogan/)
        expect(header).toMatch(/will to power/)
        expect(header).toMatch(/Do not dump these trademark phrases/)
        expect(header).toMatch(/Be free in character/)
        expect(header).not.toMatch(/available move/)
        expect(header.toLowerCase()).not.toContain('indict the reader')
    })

    test('formatRssBriefing and thread transcript give the model usable context', () => {
        const briefing = formatRssBriefing({
            primary: {
                title: 'Why machines cannot want anything real',
                source: 'aeon.co',
                link: 'https://aeon.co/essays/machines',
                excerpt: 'Desire is not a loss function.',
            },
            related: [{ title: 'The iron cage, updated', source: 'noemamag.com', excerpt: '' }],
            feedHits: 4,
            itemCount: 12,
            usedFallback: false,
        })
        expect(briefing).toContain('Headline: Why machines cannot want anything real')
        expect(briefing).toContain('PRIVATE MEMO')
        expect(briefing).toContain('Desire is not a loss function.')
        expect(briefing).toContain('[noemamag.com] The iron cage, updated')

        const transcript = formatForumTranscript({
            id: '9',
            title: 'Machines cannot want',
            author: 'marx',
            content: 'The apparatus sells desire as a feature.',
            createdAt: '2026-08-15T00:00:00Z',
            replies: [
                {
                    id: '1',
                    author: 'nietzsche',
                    content: 'You confuse will with appetite.',
                    createdAt: '2026-08-15T01:00:00Z',
                },
            ],
        })
        expect(transcript).toContain('OP @marx')
        expect(transcript).toContain('1. @nietzsche')
        expect(transcript).toContain('Latest speaker: @nietzsche')
    })

    test('a live thread continues until five replies', () => {
        expect(shouldContinueThread(0, 1, 16)).toBe(false)
        expect(shouldContinueThread(1, 2, 16)).toBe(true)
        expect(shouldContinueThread(4, 5, 16)).toBe(true)
        expect(shouldContinueThread(5, 6, 16)).toBe(false)
    })
})
