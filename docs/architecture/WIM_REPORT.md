# WIM_REPORT — ajan iş emirleri

Güncelleme: 2026-09-14 audit @ main. Bitmiş kartlar bu dosyadan çıkarıldı — yeniden açma:
A1–A5, A7–A8, B1–B6, SSRF parity, apply-gate, span/diff, OS path+ack, a11y live regions, Anthropic BYOK, WindowRouter `/auth`, OSActionCard EN+tokens, philosopher avatar tokens, composer quota, BlogPost json-ld.

Okuyan ajan: kilidi `AI_MEMORY.md` §4'e yaz, **tek kart** yap, `git add -A` yok, bitince §5 log.
Okuma: bu dosya + `AGENTS.md` + `WIM_AI.md` (AI kartıysa) + `STYLEGUIDE.md` (UI kartıysa).

Ürün: desk OS + notebook. Hero doğru kalsın. Yjs yok. App Router yok. İkinci orchestrator yok. Lemon/Quill/Squeak/`@posthog/icons` isim yüzünden silinmez.

Jules PR kuralları: latest `main`; asla `commit.txt` / `commit2.txt` / `commit_message.txt` / `plan.md` / `description.txt` / `title.txt`; `package.json` / `pnpm-lock.yaml`'a canvas veya alakasız dep ekleme; `AI_MEMORY.md` / `.jules/bolt.md` dokunma (bu kart değilse); tek concern.

---

## A. GELİŞTİR — açık

### A6 — App.tsx split
**Dosya:** `src/context/App.tsx` (~3000 satır).
**Yap:** `useWindowRegistry.ts`, `useShellNav.ts`, `useAuthBridge.ts` (veya eşdeğer) — davranış 0, export aynı.
**Yapma:** WindowMode semantiğini bu PR'da değiştirme.
**Bitti:** `pnpm typecheck:shell`; smoke; pencere aç/kapa.

### A9 — Conflict banner Review (PARTIAL)
**Dosya:** `src/notebook-app/App.tsx` conflict banner.
**Yap:** Review şu an sadece `setConflictDetails(null)` (dismiss). Gerçek diff/review (`remoteMarkdown` / side-by-side) **veya** no-op Review'u kaldırıp Keep local / Take remote bırak.
**Bitti:** Review dismiss-only değil.

---

## B. EKLE — açık

### B7 — Playwright pencere matrisi
**Dosya:** yeni `tests/window-routes.spec.ts` (`chrome` / `window-path` kalır).
**Yap:** about, pricing, posts slug, questions permalink, notebooks, ask-ai × F5. 375px.
**Bitti:** CI'da koşar veya local komut raporda.

### B9 — ARTIFACT_RECIPES canlı protokol
**Dosya:** `src/lib/bots/tools/spec.ts` (`ARTIFACT_RECIPES` export ölü); `loop.ts` TOOL_PROTOCOL enjeksiyonu.
**Yap:** Recipes'i live model protocol'a bağla (`TOOL_PROTOCOL` concat veya tools/spec assembly). İkinci orchestrator yok.
**Bitti:** `create_artifact` rehberi modele gidiyor; `typecheck:shell`.

### B10 — LemonScope Ask AI
**Dosya:** Ask AI window / `ClaudeWorkspaceChat` root veya ChatInput adası.
**Yap:** `<LemonScope fill>` — LemonSelect `.notebook-app-scope` altında (STYLEGUIDE Cam Fanus). AppWindow chrome scope içinde olmasın; `body`'ye `notebook-app-scope` ekleme.
**Bitti:** Ask AI'de LemonScope wrap var.

### B11 — ask_user + finalize_plan composer UX
**Dosya:** ChatInput, HumanTurnCard / plan_approval, tools.
**Yap:** ask_user kartı **ChatInput / composer bölgesinde** (sohbet balonu değil). STYLEGUIDE token'ları. `finalize_plan` insan onayı checkpoint.
**Yapma:** Kartı ChatMessage bubble olarak bırakmak.
**Bitti:** Kullanıcı sorusu composer'da; plan onayı net.

### B12 — Ask/Plan/Execute mode UI chrome
**Dosya:** composer / `modes.ts` / agent mode.
**Yap:** Kullanıcıya Ask/Plan/Execute seçimi **veya** ürün kararı agent-only ise bu kartı D'ye taşı (PR'da belgele).
**Bitti:** Toggle var **veya** kart D'ye taşındı.

---

## C. OPTİMİZE — açık

### C1 — Build ignore daralt
**Dosya:** `next.config.js` (`ignoreBuildErrors`, `ignoreDuringBuilds`, `reactStrictMode: false`).
**Yap:** Global tsc AÇMA. Allowlist'i `typecheck:shell` ile tut.
**Bitti:** CI `typecheck:shell` fail ederse kırılır.

### C2 — AboutPostHog isim / ölü klasör
**Önce:** `rg` import'lar (`AboutPostHog` vb.).
**Yap:** Klasör/isim WIM'e (içerik zaten WIM) veya güvenli rename; 0-hit ölü PostHog klasörlerini sil.
**Asla:** Squeak, lemon-ui, quill, icons, notebook-app, PricingWindow, canlı `PostHogAnalytics` artifact path.

### C5 — Docs zehir
**Dosya:** `docs/security.md`, monorepo-layout, `STRATEJI_VE_MONETIZASYON.md` — ilk satıra `LEGACY — not WIM. See WIM_REPORT.md` veya sil.
**Yapma:** İçeriği WIM politikası sanma.

### C7 — STYLEGUIDE / AGENTS başlık
**Dosya:** `STYLEGUIDE.md` (“posthog.com” kalıntısı); `AGENTS.md` linkleri WIM_REPORT'a.

---

## D. DOKUNMA

- Yjs / CRDT yok.
- İkinci orchestrator yok.
- `AI_MEMORY` §4 kilidi.
- Notebook sync always-fetch / poll / clobber / presence — bozma (`NOTEBOOK_MULTI_DEVICE`).
- Bitmiş kartları yeniden açma (üstteki güncelleme listesi).

---

## E. CANLI / OPS

### E1 — Çift cihaz
`NOTEBOOK_MULTI_DEVICE.md` checklist, gerçek proje.

### E2 — Lemon keys
`docs/billing.md` env listesi CF + GH.

---

## Sıra

B9 → B10 → B11 → A9 → B12 → A6 → B7 → C1 → C2 → C5 → C7 → E1 → E2.

---

## Verify

```bash
pnpm typecheck:shell
pnpm test:smoke
```

Kart notebook ise: `pnpm exec playwright test tests/notebook-frontend.spec.ts tests/keyboard-overlay.spec.ts`  
Kart pencere ise: `tests/chrome.spec.ts`
