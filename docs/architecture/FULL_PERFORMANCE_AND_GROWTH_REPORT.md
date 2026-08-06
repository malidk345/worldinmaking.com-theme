# WorldInMaking / posthog.com — Full Performance & Growth Report

**Date:** 2026-08-06  
**Scope:** `D:\all works\posthog.com`  
**Stack:** Next.js 14 (Pages Router) · React 18 · Tailwind 3 · Supabase · multi-provider AI · desktop window shell · notebook-app (Lemon UI)  
**Related docs:** `AI_MEMORY.md`, `WORLDINMAKING_SITE_IMPROVEMENT_REPORT.md`, `SUPABASE_AUTH.md`, `lemon-ui-site-integration.md`

---

## 1. Executive summary

This repository is no longer “just PostHog’s marketing site.” It is a **desktop-shell product** (windows, taskbar, search, auth, notebooks, community, AI bots) built on a large inherited PostHog.com codebase.

The product works and has strong foundations (lazy overlays, window isolation work, Supabase auth path, edge APIs, local search without Algolia). Full performance and healthy long-term growth are blocked by five structural facts:

| # | Fact | Impact |
|---|------|--------|
| 1 | **Quality gates are off in production builds** (`typescript.ignoreBuildErrors`, `eslint.ignoreDuringBuilds`) | Regressions ship silently |
| 2 | **God-object shell** (`src/context/App.tsx` ~3.3k lines; `desktop.tsx` ~2.4k lines) | Slow renders, hard tests, high regression risk |
| 3 | **Huge legacy surface** (~850 components + ~580 notebook files + heavy deps) | Bundle bloat, slow typecheck/dev, mental overhead |
| 4 | **Runtime shortcuts** (`images.unoptimized`, loose search, dual lockfiles) | Worse LCP/CLS, cold search cost, install chaos |
| 5 | **Window + route duality** (already documented) | Blank windows, inconsistent navigation |

**North star:** ship a **fast, reliable OS shell** with a **small trusted core**, and treat remaining PostHog marketing surface as optional/lazy or delete it.

---

## 2. What this project is today

### 2.1 Product map

```
┌─────────────────────────────────────────────────────────────┐
│  _app → AppProvider (windows, nav, auth hooks) → Wrapper    │
│    ├─ TaskBarMenu / Desktop / AppWindow list                │
│    ├─ SearchOverlay / CommandPalette / AuthModal (dynamic)  │
│    └─ FooterBar / ChatOverlay / CookieBanner                │
├─────────────────────────────────────────────────────────────┤
│  Routes (Pages Router)                                      │
│    /  → desktop.tsx (home content inside shell)             │
│    /[...slug] → blog, handbook, notebooks, legal, …         │
│    /api/* → search, notebooks, forum, philosopher-bots      │
├─────────────────────────────────────────────────────────────┤
│  Data & AI                                                  │
│    Supabase (auth, profiles, notebooks, community, posts)   │
│    Multi-provider AI (Gemini / Grok / Groq / OpenRouter…)   │
│    Cron: philosopher-bots (hourly on Vercel)                │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Current strengths

- Desktop shell is the product identity (not a thin marketing wrapper).
- Heavy UI pieces already use `next/dynamic` (search, auth, notebooks, mermaid, lottie).
- Supabase-only auth direction is documented and scripted (`supabase:bootstrap`).
- Local `/api/search` works without Algolia credentials; CDN cache headers present (`s-maxage=300`).
- Several edge API routes (`runtime: 'edge'`) for bots/forum.
- Ongoing cleanup: careers/pricing deletions in the working tree reduce dead weight.
- Existing improvement report correctly prioritizes window-manager unification.

### 2.3 Current risks (ranked)

1. **Build ignores TS/ESLint errors** → false confidence on deploy.  
2. **App context + desktop monoliths** → every feature touches a mega-file.  
3. **Legacy + notebook dual worlds** (webpack aliases, shims, kea stubs) → fragile builds.  
4. **Search index rebuilt in process memory** (full post scan + substring) → does not scale.  
5. **No automated smoke suite in CI** for shell routes (root, desktop, notebook, forum, search, login).  
6. **Dirty worktree breadth** → unsafe bulk commits; partial cleanups mid-flight.  
7. **Dual lockfiles** (`package-lock.json` + `pnpm-lock.yaml`) → non-reproducible installs.

---

## 3. Technical health snapshot

| Area | Observation | Health |
|------|-------------|--------|
| Framework | Next 14.2.x Pages Router; Node 22 | OK (upgrade path to 15 later) |
| Package manager | Declared `pnpm@10.23`; **both** lockfiles present | ⚠ Pick one (pnpm) |
| TypeScript | `strict: true` but **build ignores errors** | 🔴 Critical |
| ESLint | **ignored during builds** | 🔴 Critical |
| Images | `images: { unoptimized: true }` | 🔴 Perf |
| React | `reactStrictMode: false` | ⚠ Hides double-render bugs |
| App shell | `App.tsx` ~3.3k lines | 🔴 Maintainability |
| Home | `desktop.tsx` ~2.4k / ~115KB source | 🔴 First-load cost |
| Components | ~847 under `src/components` | ⚠ Prune |
| Notebook | ~577 files under `src/notebook-app` | OK if fully lazy |
| Supabase | Migrations + bootstrap scripts present | ✅ Direction correct |
| AI | Task→model routing, multi-provider fallback | ✅ Good design |
| Vercel | Large `vercel.json` (headers/rewrites/crons) | ⚠ Audit noise |
| Docs | Architecture + WIM reports exist | ✅ |

### 3.1 `next.config.js` hotspots

```js
eslint: { ignoreDuringBuilds: true },
typescript: { ignoreBuildErrors: true },
images: { unoptimized: true },
reactStrictMode: false,
```

These four lines alone prevent “full performance” culture: broken types can ship, images never get automatic AVIF/WebP/resize, and strict-mode bugs stay latent.

### 3.2 Global CSS tax (`_app.tsx`)

Many CSS files load on **every** page (global, fonts, skeleton, toast, zoom, rc-slider, markdown notebook scss). Notebook Lemon CSS is correctly *not* global—keep that discipline. Still, audit which CSS is needed for the cold shell only.

### 3.3 Search implementation debt

`src/pages/api/search.ts`:

- Loads **all** Supabase posts into a process-level promise.
- Filters with `.includes(query)` over concatenated full content.
- Caps at 20 hits (good) but cost is O(all posts × content size) per cold instance.
- Edge runtime + in-memory cache is a poor fit at scale (instances don’t share memory; cold starts pay full fetch).

---

## 4. Performance recommendations

### 4.1 Core Web Vitals / first load (P0–P1)

| Priority | Action | Why |
|----------|--------|-----|
| **P0** | Enable Next Image optimization (or Cloudflare Images / Cloudinary transforms with explicit sizes) | LCP; currently every image is full payload |
| **P0** | Split `desktop.tsx` into section components + `dynamic()` below-the-fold (carousels, Wistia, stickers, waitlist) | Home is the default route |
| **P0** | Measure First Load JS with `@next/bundle-analyzer` and set a budget (e.g. shell &lt; 250–350 KB gzip) | You cannot optimize what you don’t measure |
| **P1** | Ensure inactive windows use `content-visibility` / unmount when minimized; disable motion while drag/resize | Shell jank |
| **P1** | Tree-shake lodash (`lodash/debounce` already partial—ban `import _ from 'lodash'`) | Bundle size |
| **P1** | Lazy-load heavy libs only at use site: mermaid, mapbox, amcharts, jspdf, tsparticles, inkeep | Avoid accidental eager imports |
| **P1** | Font subsetting / variable fonts already partially present (`@fontsource-variable`); verify only used weights load | FOIT/FOUT + bytes |
| **P2** | Prefetch only high-intent routes (`/login`, notebooks, search) — not entire product nav | Network + CPU |
| **P2** | Re-enable `reactStrictMode` in staging first | Catch side-effect bugs early |

### 4.2 Runtime / API performance

| Priority | Action | Why |
|----------|--------|-----|
| **P0** | Search: Supabase full-text (`tsvector` / `websearch_to_tsquery`) or external index; stop loading full `content` for every query | Latency + memory |
| **P0** | Cache search responses at edge with key = `q + facets` (already partial `Cache-Control`) | Repeat queries free |
| **P1** | Notebooks API: pagination, ETag/If-None-Match, avoid full document list on open | UX |
| **P1** | Philosopher bots / cron: rate limits, idempotency keys, dead-letter logs; never block user requests on LLM | Stability |
| **P1** | AI provider: keep task-based model routing; add circuit breaker + timeout per provider | Tail latency |
| **P2** | Move long AI work to `bot:worker` queue (already scripted) and treat HTTP APIs as enqueue-only | Edge time limits |

### 4.3 Build & developer performance

| Priority | Action | Why |
|----------|--------|-----|
| **P0** | Single package manager: **pnpm only**; delete `package-lock.json` after verifying CI uses pnpm | Reproducible installs |
| **P0** | Incremental typecheck: keep `src/notebook-app` excluded until shell is clean; then project references | Today exclude exists—use it as a phased plan |
| **P1** | `predev` always rebuilds notebook styles — make it conditional (`if changed`) or a separate `dev:notebook` | Faster local loop |
| **P1** | Turbopack experiment (`next dev --turbo`) once aliases/shims verified | Dev HMR speed |
| **P2** | Storybook only for WIM shell components, not entire PostHog gallery | CI/dev cost |

### 4.4 Window manager performance (from existing report + code)

Still the highest-leverage **product** work:

1. Single route resolver (`WindowRouter` only).
2. `WindowMode` reducer (`normal | maximized | snapped-* | minimized`) instead of boolean soup.
3. Drag/resize/snap math only in `useWindowManager`.
4. Per-window error boundaries (already partially there—enforce everywhere).
5. Playwright: open/close/snap/mobile keyboard for root + forum + notebooks.

---

## 5. Quality, security, and operations

### 5.1 Quality gates roadmap

```
Phase A (this week)
  - pnpm only
  - Playwright smoke: /, /desktop, /login, search open, one notebook route, forum
  - Fail CI on smoke only (not full tsc yet)

Phase B (2–3 weeks)
  - Enable tsc on "shell allowlist": context/, components/AppWindow, Wrapper, Desktop, Auth, api/*
  - Keep ignoreBuildErrors for the rest via path-based scripts

Phase C
  - eslint during build for allowlist
  - reactStrictMode on in preview deploys
  - Bundle size budget comment bot or local script
```

### 5.2 Security checklist

- Service role only in `lib/supabase-admin.ts` / server routes — never `NEXT_PUBLIC_*`.
- Auth: complete migration off Squeak/Strapi leftovers (`SUPABASE_AUTH.md` remaining items).
- Edge crypto / admin-auth present — audit every API route for authz (notebooks id, forum write, bots).
- CSP is Report-Only in `vercel.json` — plan gradual enforce for WIM domains (PostHog CSP tokens may be wrong for your product).
- Bot endpoints: secret headers, cron auth, rate limits; public `philosopher-bot` must not be free LLM abuse vector.
- Env validation (`lib/env.ts`) only warns — fail hard in production runtime for required secrets.

### 5.3 Observability

| Need | Recommendation |
|------|----------------|
| Frontend errors | Error boundary + PostHog/Sentry (or your stack) per window |
| API latency | Log duration for search, notebooks, AI calls |
| AI cost | Token + provider counters per persona/task |
| Core Web Vitals | RUM (PostHog web vitals or Vercel Analytics) |
| Crons | Alert on philosopher-bots failure |

---

## 6. Architecture recommendations for growth

### 6.1 Target architecture (12 weeks)

```
packages/ or clear folders:
  shell/     App, Wrapper, Desktop, AppWindow, TaskBar, search UI
  content/   blog, handbook templates, MDX bridges
  community/ auth, profiles, forum, posts
  notebooks/ notebook-app isolation boundary
  ai/        persona-engine, providers, bots, quality-gate
  data/      supabase clients, validations
```

Do **not** invent a full monorepo overnight. Prefer **folder ownership + import rules** first; promote to packages when boundaries stabilize.

### 6.2 Kill / quarantine legacy deliberately

Working tree already deletes Careers, Pricing pages, jobs hooks—continue that pattern with a rule:

> If a route is not linked from TaskBar / Desktop / documented WIM nav, mark `legacy/` or delete after a 2-week dead-code check.

Candidates to quarantine next:

- Strapi-only hooks still pointing at Squeak host  
- Merch/Shopify unless product needs it  
- Ashby/careers remnants  
- Product marketing deep pages unused by WIM  
- Duplicate animate helpers (`AnimateIntoView` twice)

### 6.3 Data layer growth

| Domain | Now | Target |
|--------|-----|--------|
| Auth | Supabase Auth + profiles | Stable; add MFA later if needed |
| Notebooks | API + migrations | Realtime collab only if product requires it |
| Community | Supabase tables + forum APIs | RLS audit every write path |
| Blog/posts | Supabase posts | FTS + categories + draft workflow |
| Search | In-memory filter | Postgres FTS or Typesense/Meilisearch |
| AI bots | Edge + cron + worker | Queue + quality-gate before publish |

### 6.4 AI product growth (already strong foundation)

Keep:

- Task-type → model routing (`lib/ai-provider.ts`)
- Persona engine + quality gate
- Multi-provider fallback

Add:

- Structured output schemas (JSON) for forum replies  
- Cost budgets per day/provider  
- Human-in-the-loop for public posts until quality metrics stabilize  
- Evaluation set (10–20 golden prompts) run weekly  

### 6.5 Deployment model

| Option | When |
|--------|------|
| **Vercel** (current) | Best default for Next Pages + crons |
| Cloudflare `next-on-pages` (script exists) | Only if edge cost/latency requires it; dual deploy increases complexity |
| Separate worker host for bots | When LLM volume exceeds serverless limits |

Recommendation: **stay on Vercel for app**; run `bot:worker` on a cheap always-on process when cron + edge timeouts become painful.

---

## 7. Prioritized roadmap

### Sprint 0 — Stabilize (1 week)

1. Document “how to run WIM” in root README (current README still describes Gatsby-era PostHog flow).  
2. pnpm-only; remove dual lockfile.  
3. Env template `.env.example` with keys only (no secrets).  
4. Playwright smoke for shell routes.  
5. Confirm Supabase bootstrap on a clean project (`pnpm supabase:bootstrap`).  
6. Commit window/auth/notebook work in **small reviewed chunks** (no `git add -A`).

### Sprint 1 — Fast shell (2 weeks)

1. Bundle analyzer baseline + budget.  
2. Split and lazy-load `desktop.tsx` sections.  
3. Image strategy (Next Image or Cloudinary URL transforms with width).  
4. WindowRouter single path + mode reducer.  
5. Search FTS prototype (even if only title/excerpt first).

### Sprint 2 — Trust (2–3 weeks)

1. Typecheck allowlist for shell + API.  
2. Auth leftover cleanup (Squeak no-ops → Supabase).  
3. API authz audit (notebooks, forum, bots).  
4. CSP review for WIM domains.  
5. Error reporting + basic RUM.

### Sprint 3 — Scale features (ongoing)

1. Community growth loops (profiles, reputation, notifications) on solid RLS.  
2. Notebook polish (outline/history already in progress).  
3. Philosopher bots quality + rate limits.  
4. Content pipeline (posts editor, drafts, SEO).  
5. Progressive legacy deletion each sprint (measurable LOC/bundle drop).

---

## 8. KPI dashboard (what “full performance” means)

| Metric | Target (suggested) | How to measure |
|--------|--------------------|----------------|
| LCP (home, mobile 4G) | &lt; 2.5s | Lighthouse / RUM |
| INP | &lt; 200ms | RUM |
| Shell First Load JS (gzip) | Budget TBD after baseline; aim &lt; 350KB critical | Bundle analyzer |
| Search p95 | &lt; 150ms warm, &lt; 500ms cold | API logs |
| Notebook open to interactive | &lt; 2s after chunk load | Playwright timing |
| Blank window rate | 0 in smoke + production logs | Sentry/PostHog |
| Typecheck errors (shell) | 0 | CI |
| Deploy confidence | smoke green required | CI gate |
| AI bot cost / day | Cap + alert | Provider dashboards |
| Uptime of cron bots | &gt; 99% success | Vercel cron logs |

---

## 9. Concrete “do this next” list (ordered)

1. **Baseline:** `pnpm build` + bundle analyzer; record First Load JS for `/` and one notebook route.  
2. **pnpm-only** install hygiene.  
3. **Playwright smoke** for shell.  
4. **Lazy-load desktop sections** (biggest user-visible win).  
5. **Images optimization** strategy decision + implement.  
6. **Window manager single router** (blank window risk).  
7. **Search FTS** (scalability).  
8. **TS allowlist CI** for shell.  
9. **Finish Supabase auth leftovers**.  
10. **Rewrite root README** for WorldInMaking (not Gatsby PostHog).

---

## 10. What not to do yet

- Full Next.js App Router migration (huge; no ROI until shell is clean).  
- Full rewrite of notebook-app outside the shell.  
- Enabling global TypeScript build failure before allowlisting.  
- Enabling CSP enforce without inventory of third-party scripts.  
- Adding more heavy visualization libraries.  
- Broad `git add -A` while careers/pricing deletions and notebook auth land together.

---

## 11. Appendix — key paths

| Path | Role |
|------|------|
| `src/context/App.tsx` | Global shell state (target: split) |
| `src/components/Wrapper/index.tsx` | Layout + dynamic overlays |
| `src/components/AppWindow/*` | Window chrome / resize |
| `src/pages/desktop.tsx` | Home content |
| `src/pages/[...slug].tsx` | Catch-all content + notebooks |
| `src/pages/api/search.ts` | Local search |
| `src/pages/api/notebooks/*` | Notebook CRUD |
| `src/pages/api/*bot*` | AI community agents |
| `src/notebook-app/` | Isolated notebook product |
| `lib/ai-provider.ts` | Multi-provider AI |
| `lib/persona-engine.ts` | Bot personas |
| `lib/quality-gate.ts` | Output quality |
| `src/lib/wim-auth.ts` | Supabase auth mapping |
| `supabase/migrations/` | Schema + RLS |
| `scripts/wim-supabase-bootstrap.mjs` | Env setup automation |
| `next.config.js` | Build/webpack/aliases |
| `vercel.json` | Headers, rewrites, crons |

---

## 12. Closing

Full performance is not a single turbo flag. For this repo it is the product of:

1. **Measuring** the real shell bundle and vitals,  
2. **Hardening** deploy gates on a small trusted core,  
3. **Unifying** the window/navigation model,  
4. **Lazy-loading and deleting** everything else,  
5. **Scaling data access** (search, notebooks, bots) with real indexes and queues.

The codebase already points in the right product direction (desktop OS + notebooks + Supabase community + multi-provider AI). The winning strategy is **incremental extraction and measurement**, not a greenfield rewrite.

---

*Report generated from repository inspection of `D:\all works\posthog.com` on 2026-08-06. Secrets were not read or recorded.*
