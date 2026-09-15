import { describe, it, expect } from 'vitest';
import { findMatchingWindow } from '../src/lib/os/window-finder';
import { windowPathMatches } from '../src/lib/window-path';

describe('findMatchingWindow', () => {
    it('returns the window matching the target path via windowPathMatches', () => {
        const windows = [
            { path: '/other' },
            { path: '/notebooks/nb-1' },
            { path: '/workspace-chat' }
        ];

        // test that it matches path family: /notebooks/nb-1 matches /notebooks
        const result = findMatchingWindow(windows, '/notebooks', windowPathMatches);
        expect(result).toBeDefined();
        expect(result?.path).toBe('/notebooks/nb-1');
    });

    it('returns undefined if no matching window is found', () => {
        const windows = [
            { path: '/other' },
            { path: '/workspace-chat' }
        ];

        const result = findMatchingWindow(windows, '/notebooks', windowPathMatches);
        expect(result).toBeUndefined();
    });

    it('returns the first matching window if multiple exist', () => {
        const windows = [
            { path: '/notebooks/nb-2' },
            { path: '/notebooks/nb-1' }
        ];

        const result = findMatchingWindow(windows, '/notebooks', windowPathMatches);
        expect(result).toBeDefined();
        expect(result?.path).toBe('/notebooks/nb-2');
    });
});
