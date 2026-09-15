import { test, expect } from '@playwright/test';
import { resolveSplitDualPaths, resolveWorkspacePresetLayout } from '../src/lib/os/arrange-workspace';

test.describe('resolveSplitDualPaths', () => {
    test('returns first open notebook path for left and /workspace-chat for right', () => {
        const windows = [
            { path: '/other' },
            { path: '/notebooks/nb-1' },
            { path: '/notebooks/nb-2' }
        ];
        const result = resolveSplitDualPaths(windows);
        expect(result.left).toBe('/notebooks/nb-1');
        expect(result.right).toBe('/workspace-chat');
    });

    test('falls back to /notebooks if no notebook is open', () => {
        const windows = [
            { path: '/other' },
            { path: '/workspace-chat' }
        ];
        const result = resolveSplitDualPaths(windows);
        expect(result.left).toBe('/notebooks');
        expect(result.right).toBe('/workspace-chat');
    });

    test('handles empty windows array', () => {
        const result = resolveSplitDualPaths([]);
        expect(result.left).toBe('/notebooks');
        expect(result.right).toBe('/workspace-chat');
    });
});

test.describe('resolveWorkspacePresetLayout', () => {
    test('maps deep_reading / studio / research / minimal', () => {
        expect(resolveWorkspacePresetLayout('deep_reading')).toEqual({
            kind: 'split',
            left: '/posts',
            right: '/notebooks',
        });
        expect(resolveWorkspacePresetLayout('studio')).toEqual({
            kind: 'split',
            left: '/notebooks',
            right: '/workspace-chat',
        });
        expect(resolveWorkspacePresetLayout('research')).toEqual({
            kind: 'split',
            left: '/scratchpad',
            right: '/notebooks',
        });
        expect(resolveWorkspacePresetLayout('minimal')).toEqual({
            kind: 'focus',
            path: '/notebooks',
        });
    });

    test('split_dual uses open notebook when present', () => {
        const layout = resolveWorkspacePresetLayout('split_dual', [{ path: '/notebooks/nb-9' }]);
        expect(layout).toEqual({
            kind: 'split',
            left: '/notebooks/nb-9',
            right: '/workspace-chat',
        });
    });

    test('unknown and empty presets fail closed (null)', () => {
        expect(resolveWorkspacePresetLayout('')).toBeNull();
        expect(resolveWorkspacePresetLayout(undefined)).toBeNull();
        expect(resolveWorkspacePresetLayout('not_a_real_preset')).toBeNull();
    });
});

test.describe('wimArrangeWorkspace listener wiring', () => {
    test('useWindowRegistry resolves all known presets via resolveWorkspacePresetLayout', async () => {
        const { readFileSync } = await import('node:fs');
        const { resolve } = await import('node:path');
        const src = readFileSync(resolve('src/context/hooks/useWindowRegistry.ts'), 'utf8');
        expect(src).toContain("import { resolveWorkspacePresetLayout } from 'lib/os/arrange-workspace'");
        expect(src).toContain("const preset = customEvent.detail?.preset || 'split_dual'");
        expect(src).toContain('resolveWorkspacePresetLayout(preset, windowsRef.current)');
        expect(src).not.toContain('resolveSplitDualPaths(windowsRef.current)');
    });
});

test.describe('executeArrangeWorkspacePreset uses resolver', () => {
    test('execute.ts imports resolveWorkspacePresetLayout (single source of truth)', async () => {
        const { readFileSync } = await import('node:fs');
        const { resolve } = await import('node:path');
        const src = readFileSync(resolve('src/lib/bots/tools/execute.ts'), 'utf8');
        expect(src).toContain("import { resolveWorkspacePresetLayout } from '../../os/arrange-workspace'");
        expect(src).toContain('resolveWorkspacePresetLayout(p, windows)');
        // Old hard-coded split_dual right=/posts and research tile must be gone
        expect(src).not.toMatch(/case 'split_dual':[\s\S]*?rightPath = '\/posts'/);
        expect(src).not.toMatch(/case 'research':[\s\S]*?action = 'tile'/);
    });

    test('split_dual right is /workspace-chat; prefers open notebook; unknown fails closed', () => {
        const withNb = resolveWorkspacePresetLayout('split_dual', [{ path: '/notebooks/nb-x' }]);
        expect(withNb).toEqual({
            kind: 'split',
            left: '/notebooks/nb-x',
            right: '/workspace-chat',
        });
        expect(withNb!.right).not.toBe('/posts');

        const fallback = resolveWorkspacePresetLayout('split_dual', []);
        expect(fallback).toEqual({
            kind: 'split',
            left: '/notebooks',
            right: '/workspace-chat',
        });

        expect(resolveWorkspacePresetLayout('research')).toEqual({
            kind: 'split',
            left: '/scratchpad',
            right: '/notebooks',
        });

        expect(resolveWorkspacePresetLayout('zzz_unknown')).toBeNull();
    });

    test('known presets match resolver contract used by execute', () => {
        const presets = ['deep_reading', 'studio', 'minimal', 'split_dual', 'research'] as const;
        for (const preset of presets) {
            const layout = resolveWorkspacePresetLayout(preset, []);
            expect(layout).not.toBeNull();
            if (layout!.kind === 'split') {
                expect(typeof layout!.left).toBe('string');
                expect(typeof layout!.right).toBe('string');
            } else {
                expect(typeof layout!.path).toBe('string');
            }
        }
    });
});
