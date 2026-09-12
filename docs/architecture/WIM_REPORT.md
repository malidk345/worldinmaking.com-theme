# WorldInMaking — tek rapor

**Kaynak:** 2026-09-13 Grok incelemesi + bu sohbetin tamamı  
**Repo:** `malidk345/worldinmaking.com-theme`  
**Bu dosya kanoniktir.** Ağustos `FULL_PERFORMANCE_AND_GROWTH_REPORT.md`, parça parça `WIM_PRODUCT_PLAN.md` ve `WIM_ENGINEERING_BACKLOG.md` artık buraya yönlendirilir.

Ajan protokolü değişmez: `AGENTS.md`, `AI_MEMORY.md` §4 kilit, AI işi için `WIM_AI.md`, UI için `STYLEGUIDE.md`. pnpm only. `git add -A` yok. App Router yok. Yjs yok.

---

## 0. Sohbetten çıkan kararlar

1. Eski Ağustos raporu kör kaynak değil; çoğu ölçüm güncel kodda yanlış.
2. PostHog temizliği olmuş; kalan kalıntı kör silinmez (Lemon/Quill/Squeak/icons yük taşır).
3. Rapor parça parça yazılmıştı; kullanıcı tek belge istedi — işte o belge.
4. Kuzey yıldızı sitenin hero'su: *Sign in, write a note, and it stays on every device. That is the product.* Forum ve AI notebook'tan sonra.

---

## 1. Ürün nedir

Tarayıcıda yazı masasüstü. Ücretsiz **desk**, ücretli **study** (`profiles.role = pro`).

```
_app → AppProvider (src/context/App.tsx ~108KB) → Wrapper
  TaskBar / Desktop / AppWindow (WindowRouter + Chrome + snap)
  Search / Auth dynamic
  Notebook lazy chunk

/            home (desktop.tsx ~1.6KB; /desktop → /)
/[...slug]   yazı + notebook
/api/*       search, notebooks, forum, chat, bots, billing, seo
```

| Yüzey | İş | Kod |
|---|---|---|
| OS | pencere, taskbar, wallpaper | `App.tsx`, `AppWindow/*`, `TaskBarMenu`, `_document` |
| Home | hero, latest writing, notebook CTA, filozof | `src/pages/DesktopPage/*` |
| Notebook | asıl ürün, local-first + merge | `src/notebook-app/**` |
| Scratchpad / trash / assistant | OS uygulamaları | `WindowRouter` |
| Posts | deneme | `/posts`, `BlogPost` |
| Forum | Inbox | `/questions`, Squeak kökü |
| WIM AI | workspace chat | `/api/chat`, `lib/bots` |
| Filozoflar | saatlik forum | GH Actions cron |
| Study | Lemon | `PricingWindow`, webhook |
| Hesap | profil / iptal / sil | `AccountWindow` |

**Stack:** Next 14 Pages Router, React 18, Tailwind 3, pnpm 10, Node 22, Supabase.  
**Prod:** Cloudflare Pages. Cron: `.github/workflows/philosopher-bots-cron.yml`. `vercel.json` kalıntı olabilir.

Taskbar (gerçek menü): Blog, WIM AI, Assistant, Forums, About, Terms, Privacy, Display options, Keyboard shortcuts.

Görsel: token renkleri, `data-scheme`, notebook cam fanus (`.notebook-app-scope` / `LemonScope`). Stok Tailwind mavi yasak.

---

## 2. Ağustos raporunun yalanladığı şeyler

| Ağustos | Bugün |
|---|---|
| `desktop.tsx` 2.4k satır | ~1615 byte + `DesktopPage/` |
| Search tüm body'yi RAM'e çeker | `public-search.ts` + `search_posts` FTS; diğerleri title/excerpt |
| `images.unoptimized` | kalkmış; AVIF/WebP |
| Dual lockfile / Gatsby README | pnpm + WIM README |
| Pencere işi yok | WindowRouter + Chrome + snap + error boundary |

Hâlâ doğru: build TS/ESLint yutar; `reactStrictMode: false`; `App.tsx` ~108KB; image host listesinde posthog.com.

---

## 3. Bitmiş sayılacak işler (ajan tekrar yazmasın)

Home split, FTS search, Next Image, window parçaları, notebook claim/fetch/poll/clobber/presence, tek orkestratör, Lemon *kodu*, sitemap+rss, PWA meta, `typecheck:shell`, Playwright yüzeyi, CI placeholder smoke.

CI **bilerek** `placeholder.supabase.co` kullanır. Boş search 200 OK. Çift cihaz senkronu CI'da kanıtlanmaz. Testi silme.

---

## 4. Sorunlar ve eklenecekler (doğrulanmış)

### A — Vaad (P0)

Hero yalan olmasın.

- `NOTEBOOK_MULTI_DEVICE.md` canlı projede 10 madde.
- Dirty editor ezilmez; guest→login claim; silinen hortlamaz.
- Kabul: telefon + laptop, 5 dk, 0 kayıp paragraf.
- Yasak: Yjs.

### B — Kimlik (P0)

- `AboutPostHog/index.tsx` hâlâ PostHog reklamı; ReaderView + MDX kullanıyor. WIM about veya kaldır.
- `HedgehogMode` duruyor. `Squeak` forum bağı — aynı PR'da silinmez.
- `_document` PostHog analytics preconnect: ölçüm bilinçliyse kalır.
- `lang="en"`. Kitle TR ise önce `lang` + about/legal, tam çeviri sonra.
- Kör silme riskli: önce import grafiği (`WindowRouter`, `mdxGlobalComponents`, pages, navs).

### C — OS (P0)

- Path-first router var; `AppWindow/index.tsx` ~23KB hâlâ chrome/drag.
- `App.tsx` split (hook, davranış değişmez).
- `WindowMode` tek enum.
- Test: forum, post, notebook, ask-ai, about, pricing × taskbar/F5/iç nav × 375px.

### D — Keşif (P1, ekle)

- json-ld yazı + public notebook.
- Sitemap'te yayımlanmış notebook yok — ekle (`notebookPublicPath`, `is_published`).
- `/dpa` sitemap'te stub — yaz veya çıkar.

### E — Study (P1, fiş)

Kod tam (`docs/billing.md`). Eksik ops: Lemon env + webhook + migration. Fail closed bozulmaz. Pazar yeri yok.

### F — AI (P1)

Tek `orchestrate.ts`. Stream'e gate yapıştırma. Isolate kotası → kalıcı 429. BYOK vault vs header (deepseek/anthropic). Cron idempotency. `modes.ts` kilidi. `fetch_url` SSRF. `posthog-analytics` artifact adını “temizlik” diye değiştirme.

### G — Güven / doküman (P1)

- Build ignore duruyor; CI allowlist var; global tsc tek PR değil.
- `docs/security.md` Django; `monorepo-layout.md` PostHog; `STRATEJI_VE_MONETIZASYON.md` yanlış stack (App Router / TW4 / TipTap).
- `AI_MEMORY.md` ~118KB — arşivle.
- `pnpm-workspace.yaml` Gatsby hoist yorumu.

### Bilerek sonra

TR tam UI, service worker, community FTS, e-posta bülteni, odak bildirimi. Notion klonu yok.

---

## 5. Faz planı

| Faz | Süre | İş | Kabul |
|---|---|---|---|
| 0 Kimlik | 3–5 gün | AboutPostHog, ölü klasör (0 import), STYLEGUIDE başlık | Yayında PostHog about yok |
| 1 Vaad | 1 hafta | Canlı checklist, küçük fix | Çift cihaz 0 kayıp |
| 2 Pencere | 1 hafta | App.tsx split, WindowMode, Playwright | Boş pencere 0 |
| 3 Keşif + study | 1 hafta paralel | json-ld, notebook sitemap, Lemon env | sitemap + test checkout `pro` |
| 4 AI ev | sürekli | 429, BYOK, cron log, 10 prompt eval | Abuse isolate ötesi |
| 5 Sonra | — | TR lang, SW değil cache tasarımı olmadan | — |

---

## 6. Ajan kartları

Şablon:

```
Title: [Faz.N] fiil
Why: kullanıcının gördüğü cümle
Read: bu rapor + WIM_AI.md (AI ise) + AI_MEMORY §4
Touch: glob
Do not: Yjs, App Router, Lemon/Quill/Squeak silme, git add -A
Verify: pnpm typecheck:shell + ilgili spec
Accept: ölçülebilir
Log: AI_MEMORY §5
```

Sıra:

0.1 ReaderView AboutPostHog → WIM  
1.1 Canlı çift cihaz checklist  
2.1 App.tsx hook extract  
0.2 Import grafiği sonra ölü klasör  
2.2 Window normalize + Playwright  
4.1 Kalıcı rate limit  
3.1 Sitemap notebook + json-ld  
3.2 Lemon prod env (ops)  
G.1 AI_MEMORY arşiv + legacy doc damgası

Doğrulama:

```bash
pnpm typecheck:shell
pnpm test:smoke
pnpm exec playwright test tests/notebook-frontend.spec.ts tests/keyboard-overlay.spec.ts tests/chrome.spec.ts tests/billing.spec.ts tests/next-image-hosts.spec.ts
```

---

## 7. Yasaklar

App Router, Yjs, ikinci LLM, global tsc tek commit, CSP envantersiz, yeni chart lib, PostHog isimli load-bearing silme, Ağustos'u güncel sanma, placeholder testini silme, marketplace / merch / careers.

---

## 8. Ölçüt

| Ölçü | Hedef |
|---|---|
| Çift cihaz not kaybı | 0 |
| Boş pencere (6 yüzey) | 0 |
| Yayında About PostHog | 0 |
| Sitemap public notebook | ürün yayınlıyorsa var |
| typecheck:shell | CI yeşil |
| Study | test kart → `pro` |
| Chat abuse | kalıcı 429 |

Bu rapor ürünü şişirmez. Vaadi doğru, kimliği WIM, masaüstü sağlam, yazı bulunabilir, study fişli.
