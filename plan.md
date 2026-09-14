Oh! So my previous `git commit --amend` *DID* actually include the tests.
Since `PLAYWRIGHT_SKIP_WEBSERVER=1 WIM_SKIP_ENV_HARD_FAIL=1 pnpm test:smoke tests/tool-loop.spec.ts tests/agent-modes.spec.ts` passed, the fix is correct.

I can just submit.
