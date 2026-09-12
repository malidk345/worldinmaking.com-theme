# WIM Engineering Backlog (current code)

**Repo:** `malidk345/worldinmaking.com-theme`  
**Inspected SHA:** `348e7df` (2026-09-12)  
**Audience:** humans + coding agents  
**Supersedes:** `FULL_PERFORMANCE_AND_GROWTH_REPORT.md` (2026-08-06 — stale)

Read first: `AGENTS.md`, `docs/architecture/AI_MEMORY.md` §4 lock, `docs/architecture/WIM_AI.md` for AI work, `STYLEGUIDE.md`.

Do not use the August performance report, `docs/security.md` (PostHog/Django), or `docs/architecture/monorepo-layout.md` (PostHog monorepo) as WIM source of truth.

---

## 0. What this product is

Desktop OS shell for writing: windows, taskbar, search, Supabase auth, notebooks (Lemon UI, local-first + Realtime merge — not Yjs), community/forum, multi-provider Ask AI, philosopher bots.

```
_app → AppProvider (src/context/App.tsx ~108KB) → Wrapper
  TaskBar / Desktop / AppWindow (WindowRouter + Chrome + snap)
  Search / Auth dynamic
  Notebook lazy chunk

/               home (desktop.tsx is a 1.6KB redirect wrapper; /desktop → /)
/[...slug]      content + notebooks
/api/*          search, notebooks, forum, chat, bots, billing, seo
```

**Stack (real):** Next 14 Pages Router, React 18, Tailwind 3, pnpm 10, Node 22, Supabase.  
**Deploy (README):** Cloudflare Pages. Cron: `.github/workflows/philosopher-bots-cron.yml`. `vercel.json` still present — treat as leftover until audited.  
**Not doing:** App Router migration, Yjs rewrite, second LLM pipeline, `git add -A`, `npm`/`package-lock.json`.

---

## 1. Already done (do not re-litigate)

Agents keep proposing work that landed after August:

| Area | Evidence |
|---|---|
| Home split | `src/pages/desktop.tsx` is 1615 bytes; sections live under `src/pages/DesktopPage/` |
| Public search | `src/lib/public-search.ts` — posts via RPC `search_posts` (tsvector); community/people/notebooks lexical on title/excerpt only; no full-body scan |
| Next Image | `unoptimized` removed; AVIF/WebP + remotePatterns |
| Window extraction | `WindowRouter.tsx`, `WindowChrome.tsx`, `WindowContent.tsx`, `SnapAssistOverlay.tsx`, `WindowErrorBoundary.tsx` |
| Notebook sync | Device claim, open-always-fetch, 30s poll, typing clobber guards, presence channel resilience (AI_MEMORY 2026-09-12) |
| AI kernel | Single orchestrator `src/lib/bots/orchestrate.ts`; `/api/chat` Edge SSE; forum/paper `runBotTurn` tools off |
| Tests | Large Playwright/unit surface: notebook-frontend, keyboard-overlay, agent-modes, billing, chrome, ask-ai harness |
| CI | `.github/workflows/ci.yml` + `pnpm typecheck:shell` |

---

## 2. Still true problems (ranked)

### P0 — ship / trust

**P0.1 Build ignores errors**  
`next.config.js`: `eslint.ignoreDuringBuilds: true`, `typescript.ignoreBuildErrors: true`, `reactStrictMode: false`.  
`typecheck:shell` exists but production build can still ship broken types outside the allowlist.

**Do:** keep ignore for legacy paths; fail CI on `typecheck:shell`; next phase eslint allowlist (`AppWindow`, `context`, `pages/api`, `lib/bots`). Do not flip global tsc in one PR.

**P0.2 `App.tsx` god-object**  
`src/context/App.tsx` ~108KB. Windows, nav, auth side-effects, notebook events. Highest regression surface.

**Do:** extract hooks only: `useWindowRegistry`, `useShellNav`, `useAuthBridge`. No behavior change PR. Touch glob: `src/context/**`, tests that import App.

**P0.3 Window path vs element**  
`WindowRouter` already path-first for posts/questions because F5 `item.element` is an empty shell until `router.query` hydrates. `AppWindow/index.tsx` is still ~23KB and still owns chrome/drag.

**Do:** all product routes go through `canonicalWindowPath` + `WindowRouter` only. Normalize window descriptors before they enter App state. Playwright: open from taskbar, from slug F5, in-window nav — zero blank panes.

**P0.4 Docs poison**  
Delete or quarantine: August report (stubbed), `docs/security.md` (Django/HogQL), `docs/architecture/monorepo-layout.md`, `STRATEJI_VE_MONETIZASYON.md` stack claims (App Router / Tailwind 4 / TipTap — false). `AI_MEMORY.md` ~118KB — archive monthly, keep §1–4 + last 10 logs.

### P1 — leftover PostHog (safe vs unsafe)

`src/components` still has ~170 top-level names. Lemon/OS/Quill are **load-bearing**. Marketing names are not.

**Do not delete without import graph:**  
`notebook-app/**`, `@posthog/lemon-ui` alias, `@posthog/quill` shim, `@posthog/icons` shim, `LemonScope`, `OSButton`, `OSChrome`, `RadixUI`, `Squeak` (forum may still sit on it), `posthog-js` if analytics is intentional.

**Delete candidates (grep first: WindowRouter, mdxGlobalComponents, pages, navs):**  
`AboutPostHog`, `BasicHedgehogImage`, `HedgehogMode`, `CompensationCalculator`, `ContactSales`, `SalesforceForm`, `Merch`, `MaxCTA`, `SignupCTA`, `StarRepoButton`, `DocsPageSurvey`, `PlatformInstall`, `HogMap`, `SmallTeam` / careers-shaped `TeamMember` if unused.

`WindowRouter` still mounts `PricingWindow` at `/pricing` — that is a WIM window, not automatic trash.

`next.config.js` remotePatterns include `posthog.com` / `*.posthog.com`. Remove only after `tests/next-image-hosts.spec.ts` + grep pass.

`pnpm-workspace.yaml` still talks about Gatsby hoist and `@posthog/*` exclude. Clean comments/packages after unused deps drop.

**Method:** 0 imports + 0 routes → delete in a dedicated PR. 1 MDX reference → retarget then delete. Never a 50-folder commit.

### P1 — search / data (improve, don’t rewrite)

Posts already FTS. Community/people/notebooks are `ilike` on short fields — acceptable at small N. Next: `search_posts`-style RPC for `community_posts` titles; do not pull notebook bodies into public search (RLS + privacy).

`ilike.%${needle}%` uses `sanitizeSearchNeedle` — keep that. No service role on `/api/search`.

### P1 — AI / bots

Follow `WIM_AI.md`.

- Do not add a second generation path.
- Stream path has no `applyQualityGate` on purpose (tokens already flushed). Gate needs SSE buffer redesign — separate PR.
- Hourly limiter is in-memory per isolate. Durable limit (Upstash already in tree or CF KV) for `/api/chat` and public `philosopher-bot`.
- BYOK vault has deepseek/anthropic; chat does not send `x-byok-deepseek`. Either wire or drop from vault type.
- Cron: topic then reply; add idempotency key + failure log. Do not fetch RSS on the edge.
- `fetch_url` SSRF rules stay. Do not rename `posthog-analytics` artifact kind.

### P1 — notebook (verify, don’t invent collab)

Walk `docs/architecture/NOTEBOOK_MULTI_DEVICE.md` on a **real** Supabase project. Placeholder URL makes smoke red — do not delete tests.

Keep: three-way markdown merge + poll + presence. Forbidden: Yjs.

API: list pagination + omit body; ETag optional. Guest adopt only matching `device_key`.

### P2 — product gaps that fit the OS (add)

Not a Notion clone. Add only what the shell already implies:

1. **Reader/SEO already started** (`/api/seo/sitemap`, `/api/seo/rss`) — finish json-ld + indexable post body on slug pages so Google does not depend on window JS.
2. **Notifications** exist (`wim-notifications`, `?mark=mention|comment`) — unread badge + focus scroll must keep working; no new notification product.
3. **Billing** APIs + `tests/billing.spec.ts` + Lemon script exist — finish one `is_pro` source of truth wired to existing chat quotas. Do not build a marketplace.
4. **Forum bot quality** — `runBotTurn` already gated; human queue only if public volume hurts.
5. **Dead legal stubs** (`baa.tsx`, `dpa.tsx` ~140B) — either real WIM legal copy or redirect to `/guidelines` / cookies.

### P2 — performance

- Measure First Load JS (`@next/bundle-analyzer`) for `/` and one notebook route before deleting more deps. Budget after baseline, not before.
- Inactive windows: unmount or `content-visibility`; disable motion while drag (partially present).
- `predev` always rebuilds notebook CSS — make conditional if local loop hurts.
- Do not add amcharts/mapbox/sandpack to the cold shell (chunks already split in webpack).

---

## 3. Agent task cards (execute in order)

### T1 — Quarantine stale docs
Touch: `docs/architecture/*`, README links.  
Replace August file with stub (done). Point README at this file. Mark PostHog security/monorepo docs `LEGACY — not WIM`.

### T2 — Import graph of PostHog-named components
Command idea: ripgrep `AboutPostHog|HedgehogMode|CompensationCalculator|SalesforceForm|ContactSales|Merch|MaxCTA|SignupCTA` from `src/pages`, `src/components/AppWindow`, `src/mdxGlobalComponents.*`, `src/navs`.  
Output a table: used-by vs unused. Delete only unused in T3.

### T3 — Delete unused marketing folders (one PR)
Verify: `pnpm typecheck:shell`, smoke routes `/`, `/login`, `/posts`, `/questions`.

### T4 — Split App.tsx with zero behavior change
Accept: same window open/close/snap; file < half size or three hooks extracted.

### T5 — Window descriptor normalize + Playwright matrix
Paths: forum thread, post slug, notebook, ask-ai, pricing, about. Mobile 375 + visualViewport.

### T6 — Durable chat/bot rate limit
Keep 429 contract. Skip in local/dev as today.

### T7 — Multi-device notebook checklist on live project
Do not merge stale Bolt PRs. Do not commit secrets.

### T8 — SEO json-ld on published posts + public notebooks

### T9 — Pro flag → existing quota tables only

### T10 — Archive AI_MEMORY logs older than 30 days

---

## 4. Forbidden

- App Router migration
- Yjs / CRDT rewrite
- Enabling full-repo tsc fail in one shot
- CSP enforce without script inventory
- New chart library
- Second orchestrator
- Treating `docs/security.md` as WIM policy
- Deleting Lemon/Quill/icons because the package name says PostHog
- Claiming search/images/desktop-split are still August-level broken

---

## 5. Verify commands

```bash
pnpm typecheck:shell
pnpm test:smoke
pnpm exec playwright test tests/notebook-frontend.spec.ts tests/keyboard-overlay.spec.ts tests/chrome.spec.ts
```

If smoke fails on `placeholder.supabase.co`, say so. Do not delete the test.

---

*Generated from repository inspection 2026-09-13. Secrets were not read.*
