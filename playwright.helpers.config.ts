import { defineConfig } from '@playwright/test'

/** Node helper specs — no app server, no browser page. */
export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    retries: 0,
    reporter: 'list',
})
