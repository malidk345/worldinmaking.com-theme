# WIM_REPORT — ajan iş emirleri

Okuyan ajan: kilidi `AI_MEMORY.md` §4'e yaz, **tek kart** yap, `git add -A` yok, bitince §5 log.
Okuma: bu dosya + `AGENTS.md` + `WIM_AI.md` (AI kartıysa) + `STYLEGUIDE.md` (UI kartıysa).

Ürün: desk OS + notebook. Hero doğru kalsın. Yjs yok. App Router yok. İkinci orchestrator yok. Lemon/Quill/Squeak/`@posthog/icons` isim yüzünden silinmez.

---

## A. GELİŞTİR — var, yarım, bitir

### A1 — ReaderView PostHog about
**Neden:** Yayın yazının altında PostHog reklamı.
**Dosya:** `src/components/AboutPostHog/index.tsx` (reklam metni); ReaderView (çağıran — `rg AboutPostHog src`); `src/mdxGlobalComponents.js` veya `.tsx` (shortcode).
**Yap:** Metni WIM about yap VEYA ReaderView append'i kaldır. Linkler `/about`.
**Yapma:** Klasörü import varken silme.
**Bitti:** `rg "PostHog is the leading" src` = 0. `typecheck:shell`.

### A2 — WindowRouter ölü path
**Dosya:** `src/components/AppWindow/WindowRouter.tsx` (~satır manifesto / about-wim / world-in-making `return null`).
**Yap:** Üçünü `canonicalWindowPath` ile `/about` yap veya `AboutContent` render.
**Bitti:** Bu path'lerde null yok; about görünür.

### A3 — `/notebooks` pencerede iskelet
**Dosya:** `WindowRouter.tsx` (`/^\/notebooks/` → `NotebooksListSkeleton`).
**Yap:** `components/Notebooks/NotebooksList` (veya `pages/notebooks/index` export) yükle. Skeleton sadece `loading:`.
**Yapma:** Editor'ü WindowRouter'a gömme; editor `[...slug]` + notebook-app.
**Bitti:** `/notebooks` penceresinde liste.

### A4 — Login token kaçağı
**Dosya:** `WindowRouter.tsx` `bg-slate-950/90`.
**Yap:** `bg-primary` / mevcut scheme. `STYLEGUIDE.md`.
**Bitti:** o class yok.

### A5 — topic/max
**Dosya:** `src/pages/questions/topic/max.tsx`.
**Yap:** WIM topic veya `redirect` `/questions`. Inbox permalink kırılmasın.
**Bitti:** URL'de PostHog “max” ürün yok.

### A6 — App.tsx split
**Dosya:** `src/context/App.tsx` (~108KB). Yeni: `src/context/useWindowRegistry.ts`, `useShellNav.ts`, `useAuthBridge.ts`.
**Yap:** Taşı, davranış 0. Export aynı.
**Yapma:** WindowMode semantiğini bu PR'da değiştirme.
**Bitti:** `typecheck:shell`; smoke; pencere aç/kapa.

### A7 — canonical path her addWindow
**Dosya:** `src/context/App.tsx`, `src/lib/window-path.ts`, `src/lib/open-ask-ai-window.ts`.
**Yap:** State'e giren path `canonicalWindowPath`.
**Bitti:** posts/questions F5 boş kabuk 0 (mevcut path-first kalsın).

### A8 — Notebook pencerede gerçek açılış
**Dosya:** `src/pages/[...slug].tsx`, `src/notebook-app/App.tsx`, `src/lib/window-path.ts` `isNotebookWindowPath`.
**Yap:** Slug notebook ise WindowRouter path-first editor'e gitsin (liste A3, editor bu). Boş `item.element` kullanma.
**Bitti:** `/notebooks/:id` F5 içerik.

---

## B. EKLE — yok, ürün için lazım

### B1 — Sitemap published notebook
**Dosya:** `src/pages/api/seo/sitemap.ts` (STATIC_PATHS + posts + questions + profiles; notebook yok).
**Yap:** `wim_notebooks` `is_published` (veya mevcut flag) + public path helper (`notebookPublicPath` / short_id — `rg notebookPublicPath src`).
**Yapma:** Private body.
**Bitti:** Yayın not varsa `/sitemap.xml` içinde URL.

### B2 — json-ld
**Dosya:** `src/lib/seo.ts` (SITE, canonicalPath zaten var); `src/templates/BlogPost` (veya post şablon); public notebook şablon.
**Yap:** Article json-ld. Yeni kütüphane yok.
**Bitti:** Post HTML'de `application/ld+json`.

### B3 — Legal stub
**Dosya:** `src/pages/baa.tsx`, `src/pages/dpa.tsx` (~140B); sitemap STATIC_PATHS `/dpa`.
**Yap:** Metin VEYA redirect `/guidelines` + sitemap'ten çıkar.
**Bitti:** 140B boş sayfa sitemap'te yok.

### B4 — Kalıcı rate limit
**Dosya:** `src/pages/api/chat.ts`, `src/pages/api/philosopher-bot.ts`, `src/pages/api/bots/act.ts`, mevcut `checkRateLimit` (rg).
**Yap:** Upstash/KV veya CF. 429 sözleşmesi aynı. Dev skip.
**Yapma:** Yeni LLM yolu.
**Bitti:** İki isolate da sayar (dokümante et).

### B5 — BYOK eşle
**Dosya:** BYOK vault tip (`rg deepseek src/lib src/pages/api/byok`); `src/pages/api/chat.ts` header'lar.
**Yap:** `x-byok-deepseek` (ve anthropic) gönder VEYA vault'tan alanı sil.
**Bitti:** Tip ⊂ header.

### B6 — Cron idempotency
**Dosya:** `src/pages/api/cron/philosopher-bots.ts`, `.github/workflows/philosopher-bots-cron.yml`.
**Yap:** topic+reply aynı saat çift post etmesin. Log.
**Yapma:** Edge RSS.

### B7 — Playwright pencere matrisi
**Dosya:** yeni `tests/window-routes.spec.ts` (chrome.spec kalır).
**Yap:** about, pricing, posts slug, questions permalink, notebooks, ask-ai × F5. 375.
**Bitti:** CI'da koşar veya local komut raporda.

### B8 — Lemon prod (insan + küçük UI)
**Dosya:** `docs/billing.md`, `src/pages/api/billing/*`, `src/pages/api/webhooks/lemonsqueezy.ts`, `src/components/Pricing/PricingWindow.tsx`.
**Yap:** Env CF + GH. Kod fail-closed kalsın. Pricing kopyası desk/study.
**Yapma:** Marketplace.

---

## C. OPTİMİZE — davranış aynı, sürtünme düşsün

### C1 — Build ignore daralt
**Dosya:** `next.config.js` (`ignoreDuringBuilds`, `ignoreBuildErrors`, `reactStrictMode: false`).
**Yap:** Global tsc AÇMA. Allowlist'i `typecheck:shell` ile tut. İleride AppWindow+context+api+lib/bots eslint.
**Bitti:** CI hâlâ `typecheck:shell` fail eder.

### C2 — Ölü PostHog klasör
**Önce:** `rg` şunları `src/pages` `src/components/AppWindow` `src/mdxGlobalComponents*` `src/navs` `src/components/TaskBarMenu`:
`AboutPostHog HedgehogMode CompensationCalculator ContactSales SalesforceForm Merch MaxCTA SignupCTA StarRepoButton DocsPageSurvey PlatformInstall HogMap TapePlayer IdeasHub`
**Sonra:** 0 hit klasörü sil, ayrı PR.
**Asla:** Squeak, lemon-ui, quill, icons, notebook-app, PricingWindow.

### C3 — `_document` analytics
**Dosya:** `src/pages/_document.tsx` (`us.i.posthog.com`, `eu.i.posthog.com`).
**Yap:** Ölçüm bilinçliyse bırak. Değilse preconnect + `posthog-js` birlikte çık.
**Karar yoksa dokunma.**

### C4 — Image remotePatterns
**Dosya:** `next.config.js`; `tests/next-image-hosts.spec.ts`.
**Yap:** `posthog.com` ancak C2+C3 sonrası ve test yeşilse çık.

### C5 — Docs zehir
**Dosya:** `docs/security.md` (Django), `docs/architecture/monorepo-layout.md`, `STRATEJI_VE_MONETIZASYON.md` (yanlış stack).
**Yap:** İlk satıra `LEGACY — not WIM. See WIM_REPORT.md` VEYA sil.
**Yapma:** İçeriği WIM politikası sanma.

### C6 — AI_MEMORY arşiv
**Dosya:** `docs/architecture/AI_MEMORY.md` (~118KB).
**Yap:** §1–4 + son 10 log kalsın. Eski log `docs/architecture/AI_MEMORY_ARCHIVE_2026-08.md`.
**Yapma:** §4 kilidini silme.

### C7 — STYLEGUIDE / AGENTS başlık
**Dosya:** `STYLEGUIDE.md` (“posthog.com”), `AGENTS.md` (Ağustos linki — WIM_REPORT'a çevrildi, doğrula).

### C8 — pnpm-workspace yorum
**Dosya:** `pnpm-workspace.yaml` (Gatsby hoist).
**Yap:** Yorumu WIM gerçeğine çek. Paket kırma.

### C9 — `vercel.json`
**Dosya:** repo kökü `vercel.json`.
**Yap:** CF Pages için gereksizse sil veya “used for X” yorum.
**Önce:** rewrite/cron var mı oku.

### C10 — inactive window
**Dosya:** `src/components/AppWindow/index.tsx` (~23KB), WindowChrome.
**Yap:** Inactive unmount veya `content-visibility`. Drag sırası motion off (kısmen var).
**Yapma:** Yeni chart lib.

---

## D. DOKUNMA — bitmiş / kilit

- `src/lib/public-search.ts` FTS rewrite yok; community FTS sonra.
- `src/pages/desktop.tsx` tekrar bölme.
- `src/lib/bots/orchestrate.ts` ikinci kopya yok.
- `modes.ts` plan/execute.
- `fetch_url` SSRF.
- Artifact kind `posthog-analytics` rename yok.
- `tests/*` placeholder Supabase fail = test silme.
- Notebook Yjs / CRDT.
- `src/notebook-app/App.tsx` senkron: always-fetch, 30s poll, clobber guard, presence — Antigravity 2026-09-12. Bozma; checklist `docs/architecture/NOTEBOOK_MULTI_DEVICE.md` canlıda doğrula (kart E1).

---

## E. CANLI / OPS (kod şart değil)

### E1 — Çift cihaz
`NOTEBOOK_MULTI_DEVICE.md` 10 madde, gerçek proje. Sonuç §5. Kırıksa tek bug PR (A serisi notebook dosyaları).

### E2 — Lemon keys
`docs/billing.md` env listesi CF + GH. Test kart → `profiles.role=pro`.

---

## Sıra (ajan bunu atlama)

A1 → A2 → A4 → A5 → A3 → A8 → A6 → A7 → B1 → B2 → B3 → C2 (rg önce) → C5 → C7 → B4 → B5 → B6 → B7 → C1 → C6 → E1 → E2.

Paralel olmaz: C2 ile A1; A6 ile A7 aynı PR olabilir.

---

## Verify (her PR)

```bash
pnpm typecheck:shell
pnpm test:smoke
```
Kart notebook ise: `pnpm exec playwright test tests/notebook-frontend.spec.ts tests/keyboard-overlay.spec.ts`
Kart pencere ise: `tests/chrome.spec.ts`
Kart billing: `tests/billing.spec.ts`
Kart image host: `tests/next-image-hosts.spec.ts`
