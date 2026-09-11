import { test, expect } from '@playwright/test'
import {
    findDuplicateStrings,
    slashCatalogKeys,
    SLASH_REMOVED_KEYS,
    SLASH_REGISTRY_TAGS,
    SLASH_EXTRA_KEYS,
} from '../src/notebook-app/lib/components/MarkdownNotebook/insertCatalog'

test.describe('slash catalog', () => {
    test('slash inserts blocks, not share or comment chrome', () => {
        const keys = slashCatalogKeys()
        expect(findDuplicateStrings(keys)).toEqual([])
        expect(SLASH_EXTRA_KEYS).toEqual(['page-subpage'])
        expect(keys).toContain('page-subpage')
        expect(keys).toContain('media-table')
        expect(keys).not.toContain('inline-comment')
        expect(keys).not.toContain('invite-people')
        expect(keys).not.toContain('invite-philosophers')
        expect(keys).not.toContain('component-Comment')
        expect(SLASH_REGISTRY_TAGS).not.toEqual(
            expect.arrayContaining(['Query', 'FeatureFlag', 'Experiment', 'SubPage', 'Comment'])
        )
        for (const removed of SLASH_REMOVED_KEYS) {
            expect(keys).not.toContain(removed)
        }
    })
})
