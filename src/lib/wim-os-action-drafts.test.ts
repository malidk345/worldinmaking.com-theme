import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    normalizeForumDraft,
    writeForumDraft,
    readForumDraft,
    sanitizeSystemAppearanceTheme,
    WIM_FORUM_DRAFT_STORAGE_KEY,
} from './wim-os-action-drafts';

describe('wim-os-action-drafts', () => {
    describe('normalizeForumDraft', () => {
        it('normalizes a full payload to QuestionForm initial values', () => {
            const payload = { title: 'Test Title', content: 'Test content', category: 'debate' };
            const expected = { subject: 'Test Title', body: 'Test content', topic: 'debate' };
            expect(normalizeForumDraft(payload)).toEqual(expected);
        });

        it('handles missing fields', () => {
            expect(normalizeForumDraft({})).toEqual({ subject: '', body: '', topic: 'discussion' });
        });
    });

    describe('storage helpers', () => {
        let storageMap: Record<string, string>;

        beforeEach(() => {
            storageMap = {};
            vi.stubGlobal('sessionStorage', {
                getItem: vi.fn((key: string) => storageMap[key] || null),
                setItem: vi.fn((key: string, value: string) => {
                    storageMap[key] = value;
                }),
                removeItem: vi.fn((key: string) => {
                    delete storageMap[key];
                }),
            });
        });

        afterEach(() => {
            vi.unstubAllGlobals();
        });

        it('writes to sessionStorage properly', () => {
            writeForumDraft({ title: 'A', content: 'B' });
            expect(sessionStorage.setItem).toHaveBeenCalledWith(
                WIM_FORUM_DRAFT_STORAGE_KEY,
                JSON.stringify({ subject: 'A', body: 'B', topic: 'discussion' })
            );
            expect(storageMap[WIM_FORUM_DRAFT_STORAGE_KEY]).toBe(
                JSON.stringify({ subject: 'A', body: 'B', topic: 'discussion' })
            );
        });

        it('reads from sessionStorage and clears it', () => {
            storageMap[WIM_FORUM_DRAFT_STORAGE_KEY] = JSON.stringify({ subject: 'Read', body: 'Test', topic: 'discussion' });

            const result = readForumDraft();
            expect(result).toEqual({ subject: 'Read', body: 'Test', topic: 'discussion' });
            expect(sessionStorage.removeItem).toHaveBeenCalledWith(WIM_FORUM_DRAFT_STORAGE_KEY);
            expect(storageMap[WIM_FORUM_DRAFT_STORAGE_KEY]).toBeUndefined();
        });

        it('returns null when storage is empty', () => {
            expect(readForumDraft()).toBeNull();
        });
    });

    describe('sanitizeSystemAppearanceTheme', () => {
        it('sanitizes strings properly', () => {
            expect(sanitizeSystemAppearanceTheme('  MyTheme  ')).toBe('mytheme');
            expect(sanitizeSystemAppearanceTheme('THIS-IS-A-LONG-THEME-NAME-EXCEEDING-LIMIT')).toBe('this-is-a-long-theme');
            expect(sanitizeSystemAppearanceTheme(undefined)).toBeUndefined();
        });
    });
});
