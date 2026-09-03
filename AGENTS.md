# WorldInMaking — AI Agent Rules & Engineering Standards

**Document Location:** `AGENTS.md`  
**Applies To:** All AI Models & Assistant Agents (Claude, Gemini, Antigravity, GPT, Cursor, Grok, DeepSeek) working on this codebase.

---

## 1. Architecture context

1. **WIM AI map:** Read [`docs/architecture/WIM_AI.md`](docs/architecture/WIM_AI.md) before changing chat, bots, tools, BYOK, quotas, or philosopher ticks.
2. **Memory log:** [`docs/architecture/AI_MEMORY.md`](docs/architecture/AI_MEMORY.md) is a historical log, not a lock file. Do not claim tasks there.
3. **Policy:** Follow [`docs/ai/AI_POLICY.md`](docs/ai/AI_POLICY.md) for AI-assisted PRs.

---

## 2. Package Manager & Build System Rules

- **Package Manager:** Use `pnpm` exclusively (`pnpm install`, `pnpm dev`, `pnpm build`, `pnpm test:smoke`).
- **Forbidden:** Never run `npm` or `yarn`. Never generate or commit `package-lock.json`.
- **Pre-scripts:** Always respect `predev` and `prebuild` scripts (`build:notebook-styles`).

---

## 3. Architecture & Code Quality Rules

- **Framework:** Next.js 14 Pages Router + React 18 + Tailwind CSS 3.
- **Lazy Loading (Performance):** All heavy below-the-fold components (marketing sections, carousels, Wistia videos, complex stickers) must be lazy-loaded via `next/dynamic`.
- **Image Optimization:** Always use `next/image` with explicit width/height or fill mode. Do not set `unoptimized: true` in `next.config.js`. Remote image patterns are restricted to Cloudinary, GitHub, and Supabase domains.
- **Shell Decomposition:** Keep global OS shell logic isolated. Prefer single-purpose hooks and extracted routers (e.g. `WindowRouter`) over growing `src/context/App.tsx`.

---

## 4. Data, Auth & API Security Rules

- **Auth Standard:** Supabase Auth is the single identity system (`src/lib/wim-auth.ts`). Do not invoke legacy Strapi/Squeak OAuth endpoints.
- **Search Performance:** `/api/search` must query Supabase PostgreSQL (`searchSupabasePosts` in `src/lib/supabaseBlog.ts`). Never fetch all posts into Node/Edge process memory.
- **Bot Safety & Rate Limiting:** All LLM / Bot API endpoints (`src/pages/api/chat.ts`, `src/pages/api/philosopher-bot.ts`, `src/pages/api/bots/act.ts`) must enforce `checkRateLimit` (HTTP 429) and validate JSON payloads (`validateForumTopicPayload`, `validateForumReplyPayload`).

---

## 5. Verification & Testing Guidelines

- Run `pnpm test:smoke` or relevant verification commands before declaring success.
- Never fix errors by swallowing exceptions, deleting failing tests, or returning dummy 0-byte fallbacks without root cause diagnosis.
