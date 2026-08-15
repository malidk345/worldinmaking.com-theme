import { test, expect } from '@playwright/test'
import { decorateForumMentions, extractMentionHandles, mentionChipHtml } from '../src/lib/forum-mentions'

test.describe('forum mentions', () => {
    test('extracts handles from chips and plain text', () => {
        expect(extractMentionHandles('hey @Nietzsche what now')).toEqual(['Nietzsche'])
        expect(extractMentionHandles(mentionChipHtml('Weber'))).toEqual(['Weber'])
        expect(extractMentionHandles('@marx/12 leftover')).toEqual(['marx'])
    })

    test('decorates a handle as a navy chip without eating emails', () => {
        const html = decorateForumMentions('See @Lenin on this. write to a@b.com')
        expect(html).toContain('data-mention="Lenin"')
        expect(html).toContain('forum-mention')
        expect(html).toContain('a@b.com')
    })
})
