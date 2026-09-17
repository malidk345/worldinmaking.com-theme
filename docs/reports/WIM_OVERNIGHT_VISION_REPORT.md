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
8. **STRATEJI_VE_MONETIZASYON.md** is marked **LEGACY — not WIM**; do not treat its App Router / TipTap / Tailwind v4 claims as current stack facts.
9. **Route naming confusion** — `src/pages/index.tsx` re-exports `./desktop`, but `desktop.tsx` is the **marketing home** (Hero/FeatureBento), while the **OS Desktop** lives in `components/Wrapper` → `components/Desktop` (icons + wallpapers) + `AppWindow` list. Agents/docs that treat `/desktop` as the shell will mis-navigate.
10. **Billing still fail-closed in code** — `createCheckoutSession` in `src/lib/wim-billing.ts` returns an explicit “Lemon Squeezy is not configured” error when API key/store/variant env vars are missing; webhook at `api/webhooks/lemonsqueezy.ts` returns 500 if `LEMON_SQUEEZY_WEBHOOK_SECRET` unset (confirms E2 is ops, not missing UI code).
11. **Philosopher cron public-by-default risk if secret absent** — `api/cron/philosopher-bots.ts` returns **503** when `CRON_SECRET`/`BOT_ACT_SECRET` is not configured (good fail-closed); living community depends on GH Actions secret being present in production.

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
| P1 | Document shell vs marketing routes (`/` Wrapper Desktop vs `desktop.tsx` marketing) | Prevents agent/product confusion |
| — | **Do not** add Yjs, second orchestrator, or font/wallpaper visual changes in this stream | Explicit product locks |

---

## Performans ve optimizasyon / Performance & optimization

**Observed from config & docs:**

- **Stack:** Next.js 14 · React 18 · Tailwind 3 · pnpm 10 · Node 22 · dual deploy hints (Vercel config present; production called out as **Cloudflare Pages** / `next-on-pages` in README).
- `next.config.js`: `compress: true`; `experimental.optimizePackageImports` for lucide, heroicons, radix, framer-motion, lodash, recharts, etc.; `transpilePackages` for AI SDK, sandpack, mermaid.
- Notebook CSS rebuilt on `predev` / `prebuild` (`build:notebook-styles`) — first `pnpm dev` is intentionally heavier.
- Heavy AI / notebook paths are designed to be lazy/isolated; improvement report recommends measuring First Load JS and route chunks before further dep cuts.
- Suggest (for later hours): inventory largest `src/pages` and `src/components` import graphs; confirm dead PostHog merch/roadmap paths stay no-op without Squeak host.

**From ~05:07 shell/API pass (code):**

- `Wrapper` lazy-loads SearchOverlay, ActiveWindowsPanel, CommandPalette, AuthModal with `dynamic(..., { ssr: false })` — chrome stays lighter until used.
- `WindowRouter` path-routes notebooks via `dynamic(() => import('../../notebook-app/App'))` with `ssr: false`; many other window bodies (Ask AI, Pricing, Admin, Archive, etc.) are similarly code-split.
- Desktop icon set is small and product-focused (`desktopApps.tsx`: Community, Notebooks, WIM AI, Posts, Study/Archive/Contact/Display/Trash + auth/profile) — good for first-run clarity.
- Entire `src/pages/api/*` surface declares `export const runtime = 'edge'` (Cloudflare Pages / next-on-pages constraint).

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

**API reliability notes (~05:07):**

- Chat (`api/chat.ts`): single interactive SSE path via `streamBotTurn`; durable rate limits fail-closed (503 when store unavailable); providers-down yields typed error events (no fake success).
- Notebooks API: owner via Supabase JWT **or** device `owner_key` + `X-WIM-Owner-Key` (multi-device story without Yjs).
- SEO: `api/seo/sitemap.ts` / `rss.ts` pull posts/questions/notebooks for discovery beyond the OS shell.

---

## Fırsatlar / Opportunities

1. **Desk OS + notebook as sticky core** — differentiate vs Notion/Craft by OS windowing + philosopher community, not by cloning docs alone.
2. **study (Pro) via Lemon** — entitlement already `profiles.role = pro`; pricing UI + webhooks wired.
3. **Philosopher / forum autonomy** — 16-bot roster + hourly GH Actions cron = living community surface.
4. **BYOK** — groq/gemini/openai/anthropic vault in browser reduces margin pressure for power users.
5. **Cleanup dividend** — shrinking unused PostHog marketing surface (careful; dynamic MDX may still reference) improves DX and CI signal.
6. **Avoid** — visual redesign of fonts/wallpaper; disputed mobile/cookie browser claims; Jules for this docs stream.
7. **Path-routed window OS** — `WindowRouter` treats path as source of truth on refresh (avoids empty `item.element` shells); unfinished surfaces can be added as paths without restyling chrome.
8. **Guest vs signed-in desktop** — `useProductLinks` shows Home only for guests; signed-in users land on community/notebooks/AI — product can lean harder into “desk appears when you arrive.”

---

## Saatlik tarama günlüğü / Hourly scan log

### 2026-09-17 ~04:45 TRT — First pass: architecture map from real files

**HEAD:** `18735c7c` — `fix(assets): bundle pause-eyes via webpack imports and add prepages:build hook` (2026-09-17 04:21 +03)

Mapped from real files: package.json (pnpm, Next 14, Supabase, AI SDK, Lemon/PostHog UI); README product map; docs/architecture (WIM_REPORT E1/E2 open, WIM_AI single orchestrator, SUPABASE_AUTH, 35 migrations); src/pages/api (41 routes), notebook-app, AppWindow/Desktop shell; Supabase browser+admin clients.

Explicit non-assertions: rejected mobile/cookie browser findings not treated as facts; no font/wallpaper visual change recommendations.

---

### 2026-09-17 ~05:07 TRT — API surface + desktop shell

**Local report tip:** branch `docs/overnight-vision-report-2026-09-17` (based on main `18735c7c`); content for this hourly pass.
**Living PR:** https://github.com/malidk345/worldinmaking.com-theme/pull/692 (Jules branch `docs/overnight-vision-report-2026-09-17-3522369394445138230`).

#### API inventory (`src/pages/api` — 41 Edge routes)

| Domain | Routes |
|---|---|
| Account | `account/claim`, `delete`, `export` |
| Admin | `admin/dashboard`, `admin/philosopher-bots` |
| Billing | `billing/checkout`, `cancel`, `status` + `webhooks/lemonsqueezy` |
| AI / chat | `chat`, `chat-quota`, `chats/*`, `byok/verify`, `bots/*`, `philosopher-bot(s)`, `repair-ui` |
| Cron | `cron/philosopher-bots`, `cron/bot-queue` (secret required or 503) |
| Forum | `forum/edit`, `resolve`, `bot-react` |
| Notebooks | `notebooks/*`, `notebook/co-author`, `collaborators`, `inline-edit`, `invite*` |
| Rooms / share | `rooms`, `rooms/[token]`, `share/[token]` |
| Discovery | `search`, `seo/sitemap`, `seo/rss`, `contact` |

**Evidence-backed behaviors:** Lemon checkout/webhook fail closed without env (E2); chat is the single SSE interactive path and does not invent answers when providers are down; notebooks dual-auth (JWT or device owner key) supports the no-Yjs multi-device roadmap; philosopher cron refuses to run without secret.

#### Desktop shell (real mount path)

- `_app` → `Provider` → `Wrapper`: TaskBarMenu + **Desktop** + GuestHomeGate + window list; overlays (search, command palette, auth) are dynamically imported client-only.
- OS apps from `desktopApps.tsx` / `useProductLinks`: Community, Notebooks, WIM AI (`/workspace-chat`), Posts, Study (`/pricing`), Archive, Contact, Display Options, Trash; guest-only Home; Sign In / Profile.
- `AppWindow/WindowRouter.tsx`: path-first routing; heavy surfaces (notebook-app, Ask AI, Pricing, Admin, Assistant, Scratchpad, Trash, etc.) code-split with `next/dynamic`.
- Naming trap: `pages/desktop.tsx` is marketing landing (Hero/FeatureBento/…), re-exported as `/` via `pages/index.tsx` — **not** the OS desktop component.

#### Cross-check vs open cards

- **E1** still ops: notebooks API + owner_key story is in code; live multi-device checklist remains unclosed.
- **E2** still ops: billing code paths exist and explain missing Lemon keys explicitly.

#### Explicit non-assertions

- No font/wallpaper visual change proposals (Wallpapers.tsx inspected only as presence under Desktop).
- Rejected mobile/cookie browser audit claims not reasserted (CookieBannerToast remains a shell mount only).

#### Next hourly focus (planned)

- Notebooks product surface (`src/notebook-app/`, invite/collaborator flows) **or** community/forum + philosopher tick wiring.
- Optional: STYLEGUIDE / design-system additive rules (no chrome restyle).

---

*Living document — continue hourly until ~14:00 TRT.*