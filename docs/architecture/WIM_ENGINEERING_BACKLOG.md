# WIM Engineering Backlog (current code)

**Repo:** `malidk345/worldinmaking.com-theme`  
**Inspected SHA:** `348e7df` / docs commit after 2026-09-13  
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

| Area | Evidence |
|---|---|
| Home split | `src/pages/desktop.tsx` is 1615 bytes; sections live under `src/pages/DesktopPage/` |
| Public search | `src/lib/public-search.ts` — posts via RPC `search_posts` (tsvector); community/people/notebooks lexical on title/excerpt only |
| Next Image | `unoptimized` removed; AVIF/WebP + remotePatterns |
| Window extraction | `WindowRouter.tsx`, `WindowChrome.tsx`, `WindowContent.tsx`, `SnapAssistOverlay.tsx`, `WindowErrorBoundary.tsx` |
| Notebook sync | Device claim, open-always-fetch, 30s poll, typing clobber guards, presence resilience |
| AI kernel | `src/lib/bots/orchestrate.ts`; `/api/chat` Edge SSE; forum/paper `runBotTurn` tools off |
| Billing code | Lemon checkout + webhook + `profiles.role = pro` (`docs/billing.md`) — store keys are ops, not missing code |
| SEO feeds | `/api/seo/sitemap`, `/api/seo/rss`, rewrite in next.config |
| PWA chrome | `_document.tsx` manifest + apple-web-app + theme-color |
| Tests + CI | Playwright surface + `ci.yml` typecheck:shell + smoke on placeholder Supabase |

---

## 2. Still true problems (ranked)

### P0 — ship / trust

**P0.1** `next.config.js` still `ignoreDuringBuilds` / `ignoreBuildErrors` / `reactStrictMode: false`. CI already fails on `typecheck:shell`. Do not flip global tsc in one PR.

**P0.2** `src/context/App.tsx` ~108KB god-object. Extract hooks, no behavior change.

**P0.3** `WindowRouter` path-first for posts/questions (F5 empty shell). `AppWindow/index.tsx` ~23KB still owns chrome/drag. Normalize descriptors. Playwright matrix.

**P0.4** Docs poison: Django security doc, PostHog monorepo layout, strategy file claiming App Router/Tailwind 4/TipTap. `AI_MEMORY.md` ~118KB.

### P1 — PostHog leftovers (verified 2026-09-13)

Still on disk and **not empty stubs**:

- `src/components/AboutPostHog/index.tsx` — live PostHog marketing blockquote. Comment says ReaderView + MDX shortcode still use it. **This is a product bug:** WIM pages can append “About PostHog”. Replace copy with WIM about or stop auto-append.
- `src/components/HedgehogMode/index.tsx` — still a component (~3KB).
- `src/components/Squeak/**` — full tree. Treat as forum dependency until Inbox imports are mapped. Do not delete in the same PR as AboutPostHog.

`_document.tsx` still preconnects `us.i.posthog.com` / `eu.i.posthog.com`. That is analytics, not a stray folder. Keep if PostHog product analytics is intentional; otherwise drop preconnect + `posthog-js` together.

Pricing window is WIM (`docs/billing.md`). Not trash.

Lemon/Quill/icons/notebook-app: load-bearing.

### P1 — search / AI / notebook

Unchanged from first pass. Search is good enough for posts; community FTS later. No second orchestrator. No Yjs. Durable rate limit still missing. Multi-device checklist is manual on a real project — CI cannot prove it (`placeholder.supabase.co` in `ci.yml`).

### P2 — verified product gaps (add these, not a Notion clone)

These are missing or half-wired in current code:

1. **Replace AboutPostHog in ReaderView** with WIM copy or remove the auto-blockquote. Highest-visibility leftover.
2. **Sitemap omits published notebooks.** `src/pages/api/seo/sitemap.ts` indexes `/`, posts, questions (numeric id only), profiles. Public `wim_notebooks` (`is_published`) are not listed. Add `/notebooks/:short_id` (or whatever `notebookPublicPath` is) for published rows only.
3. **JSON-LD on post + public notebook pages** — sitemap exists; structured data was not found as a first-class post template concern in this pass. Add Article/ProfilePage json-ld next to existing `src/lib/seo`.
4. **Lemon store is code-complete, env-incomplete.** Do not rewrite billing. Ops: keys + webhook + migration on the live project. Product add-on only if checkout UX fails with a dead button when keys missing (docs say it must fail closed — keep that).
5. **`Html lang="en"` only.** If the writing audience is Turkish-first, that is a real add: `lang` from profile/locale, not a full i18n rewrite. Do not invent translation of the OS in the same PR.
6. **PWA manifest without claiming offline-app.** Manifest link exists; do not add a service worker that caches notebook HTML stale unless you design cache keys. Optional later.
7. **Legal stubs** `baa.tsx` / `dpa.tsx` still in sitemap STATIC_PATHS (`/dpa`). Either real text or drop from sitemap + redirect.
8. **Durable rate limit** for `/api/chat` and public philosopher-bot (in-memory isolate today).
9. **BYOK header/vault mismatch** (deepseek/anthropic in vault, not in chat headers).

Do **not** add: marketplace, Yjs, App Router, second chatbot, careers, merch, compensation calculator, weekly email product until Lemon + SEO + AboutPostHog are clean.

---

## 3. Agent task cards (execute in order)

T1 docs quarantine — README already points here; August file stubbed. Still mark `docs/security.md` + `monorepo-layout.md` LEGACY.

T2 import graph (required before deletes). Start with `AboutPostHog` — known live via ReaderView comment.

T3 delete only 0-import folders after T2 table.

T4 split App.tsx.

T5 window Playwright matrix.

T6 durable rate limit.

T7 live multi-device checklist.

T8 sitemap + json-ld including published notebooks.

T9 Lemon env on production (ops) + quota reads `profiles.role`.

T10 archive AI_MEMORY.

T11 replace AboutPostHog shortcode/ReaderView block with WIM about.

---

## 4. Forbidden

- App Router migration, Yjs, global tsc fail in one shot, CSP enforce without inventory
- New chart library, second orchestrator
- Deleting Lemon/Quill/Squeak/icons because the name says PostHog
- Claiming search/images/desktop-split are still August-broken
- Deleting tests that fail on placeholder Supabase

---

## 5. Verify commands

```bash
pnpm typecheck:shell
pnpm test:smoke
pnpm exec playwright test tests/notebook-frontend.spec.ts tests/keyboard-overlay.spec.ts tests/chrome.spec.ts tests/billing.spec.ts tests/next-image-hosts.spec.ts
```

CI smoke **intentionally** uses `https://placeholder.supabase.co` + `WIM_SKIP_ENV_HARD_FAIL=1`. Empty search hits are OK. Live sync is not proven in CI.

---

*Verification pass 2026-09-13. Secrets were not read.*
