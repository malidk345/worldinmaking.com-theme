# WorldInMaking — AI Agent Rules & Engineering Standards

**Document Location:** `AGENTS.md`  
**Applies To:** All AI models working on this codebase.

---

## 1. Multi-Agent Memory & Protocol Rules

1. **Mandatory context:** Read [`docs/architecture/AI_MEMORY.md`](docs/architecture/AI_MEMORY.md) and [`docs/architecture/WIM_REPORT.md`](docs/architecture/WIM_REPORT.md) before executing tasks. AI work also requires [`docs/architecture/WIM_AI.md`](docs/architecture/WIM_AI.md).
2. **Task claiming:** Update Section 4 of `AI_MEMORY.md` to `[IN PROGRESS by <YourModelName>]` before editing code.
3. **Change logging:** Append a Section 5 entry in `AI_MEMORY.md` with files, tests, and handoff notes.
4. **Do not** cite `FULL_PERFORMANCE_AND_GROWTH_REPORT.md` — that file was deleted. `docs/architecture/WIM_REPORT.md` is the only plan.

---

## 2. Package Manager & Build

- Use `pnpm` only. Never `npm` / `yarn` / `package-lock.json`.
- Respect `predev` / `prebuild` (`build:notebook-styles`).

---

## 3. Architecture

- Next.js 14 Pages Router + React 18 + Tailwind 3. No App Router migration.
- Images: `next/image`, no `unoptimized: true`.
- Do not grow `src/context/App.tsx`. Extract hooks / routers.
- Notebook collab is markdown merge + poll + presence. Not Yjs.
- No second LLM orchestrator. Do not delete Lemon / Quill / Squeak / `@posthog/icons` because of the name.

---

## 4. Data, Auth & API

- Auth: Supabase only (`src/lib/wim-auth.ts`). No Strapi OAuth.
- Search: `src/lib/public-search.ts` / `search_posts` RPC. Never load all posts into memory.
- Bots: `checkRateLimitDurable` (Upstash when configured, in-memory fallback) + payload validators. Workspace chat uses `failClosed: true`.

---

## 5. Verification

- `pnpm typecheck:shell` and relevant Playwright. Do not delete tests that fail on `placeholder.supabase.co`.
- Never swallow exceptions or ship dummy 0-byte fallbacks to make CI green.
