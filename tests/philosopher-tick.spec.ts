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
import { mentionedPhilosopher, pickRespondent, shouldReactToHuman } from '../src/lib/bots/forum-react'
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
        expect(parseTickRequest({ phase: 'plan' }).phase).toBe('plan')
        expect(parseTickRequest({ phase: 'REPLY', topicId: '42' })).toEqual({
            phase: 'reply',
            topicId: '42',
            topicTitle: undefined,
            postBot: undefined,
            replyBot: undefined,
            briefing: undefined,
        })
        expect(parseTickRequest({ phase: 'reply', topic_id: 'abc' }).topicId).toBeUndefined()
        const url = new URL('https://worldinmaking.com/api/cron/philosopher-bots?phase=topic')
        expect(parseTickRequest({}, url).phase).toBe('topic')
        const withBrief = parseTickRequest({
            phase: 'topic',
            briefing: { title: 'A real public argument about models', source: 'aeon.co', excerpt: 'x'.repeat(50) },
        })
        expect(withBrief.briefing?.primary.title).toMatch(/public argument/)
        expect(withBrief.briefing?.primary.source).toBe('aeon.co')
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
        expect(pickForumMove(3)).toBe('counter')
        expect(pickForumMove(4)).toBe('distinguish')
        const clipped = clipForumTitle(
            'A New Axial Age? The Berggruen Prize Question Noema magazine has announced the 2026 topic in full'
        )
        expect(clipped).toBe('A New Axial Age?')
        expect(clipped).not.toMatch(/Noema/)

        const header = buildPersonaHeader(extractPersona('', 'Nietzsche'), 'passionate', 'community_reply')
        expect(header).toContain('Nietzsche')
        expect(header).toMatch(/This turn is public/)
        expect(header).not.toMatch(/Do not dump these trademark phrases/)
    })

    test('Marx is one mind on chat, forum, and paper', () => {
        const persona = extractPersona('', 'Marx')
        const chat = buildPersonaHeader(persona, 'calm', 'autonomous_assistant', 'compact')
        const forum = buildPersonaHeader(persona, 'calm', 'community_reply')
        const paper = buildPersonaHeader(persona, 'calm', 'paper_section', 'full')
        for (const header of [chat, forum, paper]) {
            expect(header).toMatch(/method, not a costume/)
            expect(header).toMatch(/Stage first/)
            expect(header).not.toMatch(/class analysis as the lens for every/)
            expect(header).not.toMatch(/Do not dump these trademark phrases/)
            expect(header).not.toMatch(/surplus value/)
        }
        expect(forum).toMatch(/This turn is public/)
        expect(chat).toMatch(/Answer first/)
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

    test('resolveBotProfile reads profiles, not bot_profiles.name', async () => {
        const { resolveBotProfile } = await import('../src/lib/bots/actions/forum')
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
        const urls: string[] = []
        const original = globalThis.fetch
        globalThis.fetch = (async (input: RequestInfo | URL) => {
            const url = String(input)
            urls.push(url)
            if (url.includes('/profiles?')) {
                return new Response(
                    JSON.stringify([
                        { id: '00000000-0000-0000-0000-000000000012', username: 'Nietzsche', is_bot: true },
                    ]),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
            }
            return new Response(JSON.stringify({ message: 'unexpected' }), { status: 500 })
        }) as typeof fetch
        try {
            const result = await resolveBotProfile('nietzsche')
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.bot.id).toBe('00000000-0000-0000-0000-000000000012')
                expect(result.bot.username).toBe('Nietzsche')
            }
            expect(urls[0]).toContain('/profiles?')
            expect(urls.join('\n')).not.toContain('bot_profiles?select=id,name')
        } finally {
            globalThis.fetch = original
        }
    })

    test('authorFromRow resolves bot ids from the live name map', async () => {
        const { authorFromRow } = await import('../src/lib/bots/forum-thread')
        const names = new Map([['00000000-0000-0000-0000-000000000012', 'Nietzsche']])
        expect(authorFromRow({ author_id: '00000000-0000-0000-0000-000000000012' }, names)).toBe('Nietzsche')
        expect(authorFromRow({ author_id: 'missing' }, names)).toBe('unknown')
    })

    test('a human post invites a philosopher who has not spoken yet', () => {
        const thread = {
            id: '8',
            title: 'Are feeds a square?',
            author: 'ali',
            content: 'I think @marx should look at this.',
            createdAt: '2026-08-16T10:00:00Z',
            replies: [],
        }
        expect(shouldReactToHuman(thread).ok).toBe(true)
        expect(mentionedPhilosopher(thread.content)).toBe('marx')
        expect(pickRespondent(thread)).toBe('marx')
        expect(
            shouldReactToHuman({
                ...thread,
                replies: [
                    {
                        id: '1',
                        author: 'nietzsche',
                        content: 'No.',
                        createdAt: new Date().toISOString(),
                    },
                ],
            }).ok
        ).toBe(false)
    })

    test('long forum transcripts keep the latest replies in full', () => {
        const replies = Array.from({ length: 10 }, (_, i) => ({
            id: String(i + 1),
            author: `bot${i}`,
            content: `Full paragraph ${i + 1}. ${'word '.repeat(40)}`,
            createdAt: '2026-08-16T10:00:00Z',
        }))
        const text = formatForumTranscript({
            id: '9',
            title: 'Are feeds a square?',
            author: 'marx',
            content: 'Opening case.',
            createdAt: '2026-08-16T09:00:00Z',
            replies,
        })
        expect(text).toMatch(/1\. @bot0: Full paragraph 1\./)
        expect(text).not.toMatch(/1\. @bot0:\nFull paragraph 1/)
        expect(text).toMatch(/10\. @bot9:\nFull paragraph 10/)
        expect(text).toMatch(/Latest speaker: @bot9/)
    })

    test('a live thread can keep growing well past five replies', () => {
        expect(shouldContinueThread(0, 1, 16)).toBe(true)
        expect(shouldContinueThread(1, 2, 16)).toBe(true)
        expect(shouldContinueThread(5, 6, 16)).toBe(true)
        expect(shouldContinueThread(20, 8, 16)).toBe(true)
        expect(shouldContinueThread(32, 8, 16)).toBe(false)
        expect(pickForumMove(3)).not.toBe('close')
        expect(pickForumMove(8)).not.toBe('close')
    })
})
