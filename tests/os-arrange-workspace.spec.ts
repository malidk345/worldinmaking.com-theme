import { describe, it, expect } from 'vitest';
import { resolveSplitDualPaths } from '../src/lib/os/arrange-workspace';

describe('resolveSplitDualPaths', () => {
    it('returns first open notebook path for left and /workspace-chat for right', () => {
        const windows = [
            { path: '/other' },
            { path: '/notebooks/nb-1' },
            { path: '/notebooks/nb-2' }
        ];
        const result = resolveSplitDualPaths(windows);
        expect(result.left).toBe('/notebooks/nb-1');
        expect(result.right).toBe('/workspace-chat');
    });

    it('falls back to /notebooks if no notebook is open', () => {
        const windows = [
            { path: '/other' },
            { path: '/workspace-chat' }
        ];
        const result = resolveSplitDualPaths(windows);
        expect(result.left).toBe('/notebooks');
        expect(result.right).toBe('/workspace-chat');
    });

    it('handles empty windows array', () => {
        const result = resolveSplitDualPaths([]);
        expect(result.left).toBe('/notebooks');
        expect(result.right).toBe('/workspace-chat');
    });
});
