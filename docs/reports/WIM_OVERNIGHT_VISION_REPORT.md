# WIM Overnight Vision & Product Report (Living)

**Repo:** `malidk345/worldinmaking.com-theme`
**Branch:** `docs/overnight-vision-report-2026-09-17`
**Window:** ~04:45 → ~14:00 Europe/Istanbul (TRT), 2026-09-17
**Status:** Living document — hourly updates; **do not merge** until Sona reviews.
**Constraints honored:** no app/code changes in this stream; do not change fonts or wallpaper visuals; do not assert rejected mobile/cookie browser findings as facts.

---

## Vizyon / Vision

### TR
WorldInMaking (WIM), PostHog.com’dan miras alınan Next.js Pages Router kod tabanı üzerinde şekillenen bir **masaüstü OS kabuğu** ürünüdür: pencereler, taskbar, arama, auth, notebook’lar, topluluk/forum ve AI bot’lar tek yüzeyde birleşir. Ürün vaadi, “bir yazma masası” — okuma, not alma, tartışma ve AI ile düşünmeyi aynı OS estetiğinde toplamak.

### EN
WIM is a **desktop OS shell** product: windows, taskbar, search, auth, notebooks, community/forum, and AI bots on one surface. Promise: a desk for writing — reading, notes, discussion, and AI thinking under one OS aesthetic. Explicit non-goals (from `WIM_REPORT.md` / README): no Yjs/CRDT rewrite, no App Router migration yet, no second AI orchestrator, do not restyle existing chrome (STYLEGUIDE is additive only), do not delete Lemon/Quill/Squeak/`@posthog/icons` merely for naming legacy.

**Canonical product map (README):**

```
_app → AppProvider (windows, nav, auth) → Wrapper
  ├─ TaskBar / Desktop / AppWindow list
  ├─ Search / Command palette / Auth (dynamic)
  └─ Footer / Chat overlay

Routes:  /  ·  /desktop  ·  /[...slug]  ·  /api/*
Data:    Supabase (auth, profiles, notebooks, community, posts)
AI:      lib/ai-provider · persona-engine · philosopher bots + cron
```

---

## Ürün eksikleri / Product gaps

Evidence from repo docs + structure (not from disputed browser QA):

1. **Ops / live verification still open** — `WIM_REPORT.md` open cards are only **E1** (multi-device notebook checklist on a real project) and **E2** (Lemon keys in CF + GH). A/B development cards are marked complete.
2. **CI / env fidelity** — `NOTEBOOK_SAAS_ROADMAP.md` notes Playwright smoke on `main` can be red against `placeholder.supabase.co`; real-project walk of `NOTEBOOK_MULTI_DEVICE.md` is the intended next step.
3. **Type safety debt** — `next.config.js` sets `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true`; trusted gate is path-filtered `pnpm typecheck:shell`, not full-tree TS.
4. **Legacy surface mass** — large inherited PostHog UI/templates/components still present under `src/components` and pages; increases bundle discovery cost and maintenance (called out in `WORLDINMAKING_SITE_IMPROVEMENT_REPORT.md`).
5. **Window architecture residual risk** — improvement report still flags historical duplication between `AppWindow` routing and `WindowRouter` / chrome / content split (many A-cards done; keep regression vigilance).
6. **Billing go-live** — Lemon Squeezy code paths exist (`docs/billing.md`); checkout fails closed until store env is configured (E2).
7. **Email confirm / SMTP** — auth stays autoconfirm until SMTP + `WIM_REQUIRE_EMAIL_CONFIRM` (see `SUPABASE_AUTH.md`).
8. **STRATEJI_VE_MONETIZASYON.md` is marked **LEGACY — not WIM**; do not treat its App Router / TipTap / Tailwind v4 claims as current stack facts.

---

## Önerilen eklemeler / Recommended additions

Prioritized for product leverage without visual chrome restyle:

| Priority | Item | Why |
|---|---|---|
| P0 | Complete E1 multi-device notebook checklist on real Supabase | Unlocks trust for sync/presence claims |
| P0 | Complete E2 Lemon env on Cloudflare Pages + GitHub | Monetization path is coded but dark without keys |
| P1 | Keep shell gates green (`typecheck:shell`, smoke) with real env in CI secrets | Red smoke against placeholders hides regressions |
| P1 | Continue lazy-loading / isolation of notebook + heavy routes | Performance without restyling |
| P2 | Reader/SEO surfaces for posts (json-ld already touched in past work) | Discovery beyond the desktop shell |
| P2 | Harden BYOK UX + quota messaging | AI is a core differentiator (`WIM_AI.md`) |
| P3 | Reputation / dossiers / creator economy | From vision docs — after desk+notebook reliability |
| — | **Do not** add Yjs, second orchestrator, or font/wallpaper visual changes in this stream | Explicit product locks |

---

## Performans ve optimizasyon / Performance & optimization

**Observed from config & docs:**

- **Stack:** Next.js 14 · React 18 · Tailwind 3 · pnpm 10 · Node 22 · dual deploy hints (Vercel config present; production called out as **Cloudflare Pages** / `next-on-pages` in README).
- `next.config.js`: `compress: true`; `experimental.optimizePackageImports` for lucide, heroicons, radix, framer-motion, lodash, recharts, etc.; `transpilePackages` for AI SDK, sandpack, mermaid.
- Notebook CSS rebuilt on `predev` / `prebuild` (`build:notebook-styles`) — first `pnpm dev` is intentionally heavier.
- Heavy AI / notebook paths are designed to be lazy/isolated; improvement report recommends measuring First Load JS and route chunks before further dep cuts.
- Suggest (for later hours): inventory largest `src/pages` and `src/components` import graphs; confirm dead PostHog merch/roadmap paths stay no-op without Squeak host.

---

## Kalite / güvenilirlik / Quality & reliability

| Gate | Role |
|---|---|
| `pnpm typecheck:shell` | Trusted TS for shell / API / bots allowlist |
| `pnpm lint:shell` | ESLint on shell-critical paths |
| `pnpm test:smoke` | Playwright: `/`, `/desktop`, `/login`, search, posts, forum |
| `.github/workflows/ci.yml` | CI = typecheck:shell + smoke |
| `pnpm supabase:smoke` / bootstrap | Against a real project (needs tokens) |
| Philosopher cron | `.github/workflows/philosopher-bots-cron.yml` → `/api/cron/philosopher-bots` |

**AI reliability (from `WIM_AI.md`):** single orchestrator (`streamBotTurn` / `runBotTurn`); Edge SSE chat with abort; durable quotas via Upstash when configured (fail-closed); SSRF guards on `fetch_url` / `read_document`; quality gate on bot turns.

**Auth reliability:** Supabase-only (`SUPABASE_AUTH.md`); Squeak fetch guard in `App.tsx`; service role never `NEXT_PUBLIC_*`.

---

## Fırsatlar / Opportunities

1. **Desk OS + notebook as sticky core** — differentiate vs Notion/Craft by OS windowing + philosopher community, not by cloning docs alone.
2. **study (Pro) via Lemon** — entitlement already `profiles.role = pro`; pricing UI + webhooks wired.
3. **Philosopher / forum autonomy** — 16-bot roster + hourly GH Actions cron = living community surface.
4. **BYOK** — groq/gemini/openai/anthropic vault in browser reduces margin pressure for power users.
5. **Cleanup dividend** — shrinking unused PostHog marketing surface (careful; dynamic MDX may still reference) improves DX and CI signal.
6. **Avoid** — visual redesign of fonts/wallpaper; disputed mobile/cookie browser claims; Jules for this docs stream beyond this one PR.

---

## Saatlik tarama günlüğü / Hourly scan log

### 2026-09-17 ~04:45 TRT — First pass: architecture map from real files

**HEAD:** `18735c7c` — `fix(assets): bundle pause-eyes via webpack imports and add prepages:build hook` (2026-09-17 04:21 +03)

#### package.json
- Name `worldinmaking.com` v1.0.0, private, Node `22.x`, packageManager **pnpm@10.23.0**.
- Scripts: `dev`/`build`/`start`, `build:notebook-styles`, `pages:build` (`next-on-pages`), `bot:worker`, `supabase:bootstrap`/`smoke`, `billing:setup`, `test:smoke` (Playwright), `typecheck:shell`, `lint:shell`, `demo:record`.
- Key deps: `next@^14.2.5`, `react@^18.3.1`, `@supabase/supabase-js`, `ai` + `@ai-sdk/*`, `@langchain/langgraph`, Lemon/PostHog UI packages, Radix, Tailwind, Zustand, Framer Motion, Three.js, Mapbox, Mermaid, Playwright/Vitest (dev), Cloudflare `next-on-pages` + wrangler.

#### README.md
- Product: Desktop OS shell on PostHog.com-inherited Pages Router.
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; optional AI + cron secrets.
- Production note: Cloudflare Pages; philosopher cron is GitHub Actions (not Vercel).
- Key paths: `src/context/App.tsx`, `src/components/AppWindow/`, `src/pages/desktop.tsx`, `src/pages/api/`, `src/notebook-app/`, `src/lib/wim-auth.ts`.

#### docs/architecture/
| File | Role |
|---|---|
| `WIM_REPORT.md` | Agent work orders; A/B done; open E1/E2 |
| `WIM_AI.md` | Single orchestrator, tools, quotas, philosophers |
| `SUPABASE_AUTH.md` | Supabase-only auth; Squeak cleanup status |
| `SUPABASE_LIVE_SCHEMA.md` | Large live schema reference |
| `NOTEBOOK_MULTI_DEVICE.md` | Sync checklist (no Yjs) |
| `AI_MEMORY.md` | Agent lock/log protocol |
| `WORLDINMAKING_SITE_IMPROVEMENT_REPORT.md` | Window/perf/legacy risks |
| `lemon-ui-site-integration.md` | Lemon UI integration notes |
| `monorepo-layout.md` | Layout notes |

Other docs: `docs/billing.md`, `docs/NOTEBOOK_SAAS_ROADMAP.md`, `docs/security.md` (legacy PostHog-oriented header), `docs/CONTRIBUTING.md`, `docs/skills/`, `docs/ui/`.

#### src/ structure (high level)
- `src/pages/` — Pages Router: `_app`, `_document`, `index`/`home`/`desktop`, auth (`login`, `auth/`), `notebooks/`, `posts/`, `blog/`, `community/`, `forum/`, `profile/`, `api/` (**41** route files including chat, bots, notebooks, forum, billing, cron, SEO).
- `src/components/` — large OS + legacy set: `AppWindow`, `Desktop`, `TaskBarMenu`, `Auth`, `Notebooks`, `CommandPalette`, `Search`, Lemon/OS primitives, plus many inherited PostHog marketing components.
- `src/context/` — `App.tsx` shell state; Window/Toast/Archive.
- `src/lib/` — supabase clients, wim-auth, bots/orchestrator, os dispatch, chat, billing helpers, BYOK vault, persona-engine, etc.
- `src/notebook-app/` — isolated notebook product (`App.tsx`, components, scenes, styles, types).
- Also: `constants`, `hooks`, `styles`, `templates`, `menuItems`, `navs`, `data`, `images`.

#### Supabase usage
- Browser client: `src/lib/supabase.ts` (`createClient`, PKCE, localStorage session).
- Admin / service role: `src/lib/supabaseAdmin.ts`, `lib/supabase-admin.ts` (API-only).
- Domain helpers: `supabaseBlog`, `supabaseCommunity`, `wim-auth`, `public-search`, notebook/collaborator clients, bot edge helpers.
- Migrations: **35** SQL files under `supabase/migrations/` (profiles/auth RLS, notebooks, forum, billing entitlements, realtime RLS, collaborators, assistants, file metadata, hardening, etc.).
- Bootstrap/smoke scripts: `pnpm supabase:bootstrap`, `pnpm supabase:smoke`.

#### Explicit non-assertions
- This pass does **not** treat rejected mobile/cookie browser findings as verified product bugs.
- No font or wallpaper visual recommendations that would change existing chrome.

#### Next hourly focus (planned)
- Deeper API surface inventory (`src/pages/api/*`) vs docs.
- Gap analysis vs E1/E2 and billing readiness.
- Risk register from `WORLDINMAKING_SITE_IMPROVEMENT_REPORT.md` vs current `WIM_REPORT` completion state.
- Optional: sample Playwright/CI workflow expectations without running against placeholder env as “facts about production.”

---

*End of first pass. Document will grow with dated hourly entries until ~14:00 TRT.*