import { describe, it, mock, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { parseFeed, fetchAndParseFeed } from '../../lib/feed-parser.ts';

// Silence console.error and console.log for clean test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
console.log = () => {};
console.error = () => {};

describe('feed-parser', () => {
    describe('parseFeed', () => {
        it('should parse an Atom feed correctly', () => {
            const atomXml = `
                <?xml version="1.0" encoding="utf-8"?>
                <feed xmlns="http://www.w3.org/2005/Atom">
                    <title>Example Feed</title>
                    <entry>
                        <title>Atom Entry Title 1</title>
                        <link href="http://example.com/atom1" />
                        <id>urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a</id>
                    </entry>
                    <entry>
                        <title>Atom Entry Title 2</title>
                        <link href="http://example.com/atom2" />
                    </entry>
                </feed>
            `;
            const items = parseFeed(atomXml);
            assert.equal(items.length, 2);
            assert.deepEqual(items[0], {
                title: 'Atom Entry Title 1',
                link: 'http://example.com/atom1',
                guid: 'urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a'
            });
            assert.deepEqual(items[1], {
                title: 'Atom Entry Title 2',
                link: 'http://example.com/atom2',
                guid: 'http://example.com/atom2' // fallback to link when id is missing
            });
        });

        it('should parse an RSS feed correctly', () => {
            const rssXml = `
                <?xml version="1.0" encoding="UTF-8" ?>
                <rss version="2.0">
                    <channel>
                        <title>RSS Title</title>
                        <item>
                            <title>RSS Item Title 1</title>
                            <link>http://example.com/rss1</link>
                            <guid>http://example.com/rss1-guid</guid>
                        </item>
                        <item>
                            <title>RSS Item Title 2</title>
                            <link>http://example.com/rss2</link>
                        </item>
                    </channel>
                </rss>
            `;
            const items = parseFeed(rssXml);
            assert.equal(items.length, 2);
            assert.deepEqual(items[0], {
                title: 'RSS Item Title 1',
                link: 'http://example.com/rss1',
                guid: 'http://example.com/rss1-guid'
            });
            assert.deepEqual(items[1], {
                title: 'RSS Item Title 2',
                link: 'http://example.com/rss2',
                guid: 'http://example.com/rss2' // fallback to link when guid is missing
            });
        });

        it('should handle CDATA in RSS feed', () => {
            const rssXmlWithCdata = `
                <rss>
                    <channel>
                        <item>
                            <title><![CDATA[RSS Item Title with CDATA]]></title>
                            <link>http://example.com/rss-cdata</link>
                            <guid><![CDATA[http://example.com/rss-cdata-guid]]></guid>
                        </item>
                    </channel>
                </rss>
            `;
            const items = parseFeed(rssXmlWithCdata);
            assert.equal(items.length, 1);
            assert.deepEqual(items[0], {
                title: 'RSS Item Title with CDATA',
                link: 'http://example.com/rss-cdata',
                guid: 'http://example.com/rss-cdata-guid'
            });
        });

        it('should handle CDATA in Atom feed', () => {
            const atomXmlWithCdata = `
                <feed xmlns="http://www.w3.org/2005/Atom">
                    <entry>
                        <title><![CDATA[Atom Entry Title with CDATA]]></title>
                        <link href="http://example.com/atom-cdata" />
                        <id>urn:uuid:cdata-1234</id>
                    </entry>
                </feed>
            `;
            const items = parseFeed(atomXmlWithCdata);
            assert.equal(items.length, 1);
            assert.deepEqual(items[0], {
                title: 'Atom Entry Title with CDATA',
                link: 'http://example.com/atom-cdata',
                guid: 'urn:uuid:cdata-1234'
            });
        });

        it('should return empty array for empty or invalid XML', () => {
            assert.equal(parseFeed('').length, 0);
            assert.equal(parseFeed('Just some plain text').length, 0);
        });

        it('should skip items without title or link', () => {
            const rssXml = `
                <rss>
                    <channel>
                        <item>
                            <title>Only Title</title>
                        </item>
                        <item>
                            <link>http://example.com/only-link</link>
                        </item>
                        <item>
                            <title>Valid Item</title>
                            <link>http://example.com/valid</link>
                        </item>
                    </channel>
                </rss>
            `;
            const items = parseFeed(rssXml);
            assert.equal(items.length, 1);
            assert.deepEqual(items[0], {
                title: 'Valid Item',
                link: 'http://example.com/valid',
                guid: 'http://example.com/valid'
            });
        });
    });

    describe('fetchAndParseFeed', () => {
        const originalFetch = global.fetch;

        afterEach(() => {
            global.fetch = originalFetch;
        });

        it('should fetch and parse feed successfully', async () => {
            const rssXml = `
                <rss>
                    <channel>
                        <item>
                            <title>Fetched Title</title>
                            <link>http://example.com/fetched</link>
                        </item>
                    </channel>
                </rss>
            `;

            global.fetch = mock.fn(async () => {
                return {
                    ok: true,
                    text: async () => rssXml,
                } as Response;
            });

            const items = await fetchAndParseFeed('http://example.com/feed.xml');
            assert.equal(items.length, 1);
            assert.deepEqual(items[0], {
                title: 'Fetched Title',
                link: 'http://example.com/fetched',
                guid: 'http://example.com/fetched'
            });

            assert.equal((global.fetch as { mock: { calls: { arguments: unknown[] }[] } }).mock.calls.length, 1);
            const callArgs = (global.fetch as { mock: { calls: { arguments: unknown[] }[] } }).mock.calls[0].arguments;
            assert.equal(callArgs[0], 'http://example.com/feed.xml');
            assert.equal(callArgs[1]?.headers['User-Agent'], 'Mozilla/5.0 (compatible; WorldInMakingBot/1.0)');
        });

        it('should return empty array when fetch fails with non-200 status', async () => {
            global.fetch = mock.fn(async () => {
                return {
                    ok: false,
                    status: 404,
                    statusText: 'Not Found',
                } as Response;
            });

            const items = await fetchAndParseFeed('http://example.com/404.xml');
            assert.equal(items.length, 0);
        });

        it('should return empty array when fetch throws an error', async () => {
            global.fetch = mock.fn(async () => {
                throw new Error('Network error');
            });

            const items = await fetchAndParseFeed('http://example.com/error.xml');
            assert.equal(items.length, 0);
        });
    });
});
