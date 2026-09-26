import { configDefaults, defineConfig, type Plugin } from 'vitest/config'
import path from 'path'

const appLib = path.resolve(__dirname, './src/lib')
const notebookLib = path.resolve(__dirname, './src/notebook-app/lib')
const notebookShim = path.resolve(__dirname, './src/notebook-app/lib/lemon-ui.tsx')

/**
 * Mirrors the notebook-app rules of the NormalModuleReplacementPlugin in next.config.js:
 * inside src/notebook-app, `lib/*` means the notebook's own lib folder (~nb-lib/*), and
 * `~/…`, `scenes/…`, posthog-js, @posthog/react and use-resize-observer resolve to the lemon-ui
 * shim. Without this, the notebook tests
 * resolve `lib/*` to src/lib and fail to load.
 */
function notebookAppAliases(): Plugin {
    return {
        name: 'wim-notebook-app-aliases',
        enforce: 'pre',
        async resolveId(source, importer, options) {
            const fromNotebook = Boolean(importer && importer.replace(/\\/g, '/').includes('/src/notebook-app/'))
            if (source.startsWith('lib/')) {
                // App code: `lib/*` → src/lib/* (the old test.alias); notebook-app: its own lib.
                const base = fromNotebook ? notebookLib : appLib
                return this.resolve(path.join(base, source.slice(4)), importer, { ...options, skipSelf: true })
            }
            if (!fromNotebook) return null
            if (source.startsWith('~/') || source.startsWith('scenes/')) return notebookShim
            if (source === 'posthog-js' || source === '@posthog/react' || source === 'use-resize-observer') return notebookShim
            return null
        },
    }
}

/**
 * Vendored PostHog notebook tests that cannot run in this repo (they need PostHog's real
 * `~/types` enums, its dayjs setup, @tiptap/markdown, DateFilter or Jest module mocks; the
 * webpack build maps those to shims). Quarantined like the typecheck:shell quarantine —
 * port or delete them deliberately; do not add new entries to hide real failures.
 */
const QUARANTINED_TESTS = [
    'src/notebook-app/lib/hooks/useKeyboardHotkeys.test.tsx', // jest.mock module factories
    'src/notebook-app/lib/utils/dateFilters.test.ts', // lib/components/DateFilter not vendored
    'src/notebook-app/lib/utils/datetime.test.ts', // PostHog dayjs plugin setup
    'src/notebook-app/lib/utils/durations.test.ts', // ~/types enums (shimmed)
    'src/notebook-app/lib/utils/events.test.ts', // ~/types / taxonomy (shimmed)
    'src/notebook-app/lib/utils/markdown.test.ts', // @tiptap/markdown not installed
    'src/notebook-app/lib/utils/operators.test.ts', // ~/types enums (shimmed)
    'src/notebook-app/lib/utils/time-tree.test.ts', // PostHog dayjs plugin setup
    'src/notebook-app/lib/lemon-ui/LemonDropdown/LemonDropdown.test.tsx', // jsdom 16 MouseEvent + user-event 14
]

export default defineConfig({
  // tsconfig uses "jsx": "preserve" for Next; vitest needs JSX compiled to run .tsx component tests.
  oxc: { jsx: { runtime: 'automatic' } },
  plugins: [notebookAppAliases()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/vitest/setup.ts'],
    exclude: [...configDefaults.exclude, ...QUARANTINED_TESTS],
    alias: {
      '~nb-lib': path.resolve(__dirname, './src/notebook-app/lib'),
      'components': path.resolve(__dirname, './src/components'),
      // Same target as next.config.js / tsconfig paths.
      '@posthog/lemon-ui': path.resolve(__dirname, './src/notebook-app/lib/lemon-ui/index.ts')
    }
  }
})
