# WIM_REPORT — ajan iş emirleri

Güncelleme: Latest audit @ main. Bitmiş kartlar bu dosyadan çıkarıldı — yeniden açma:
A1–A5, A7–A8, A9 (Conflict banner Review), B1–B6, B7 (Playwright window-routes), B9 (ARTIFACT_RECIPES), B10 (LemonScope Ask AI), B11 (ask_user composer), B12 (Ask/Plan/Execute UI), C1 (Build ignore), C2 (AboutPostHog rename), C5 (Docs banners), C7 (STYLEGUIDE/AGENTS titles), SSRF parity, apply-gate, span/diff, OS path+ack, a11y live regions, Anthropic BYOK, WindowRouter `/auth`, OSActionCard EN+tokens, philosopher avatar tokens, composer quota, BlogPost json-ld.

Okuyan ajan: kilidi `AI_MEMORY.md` §4'e yaz, **tek kart** yap, `git add -A` yok, bitince §5 log.
Okuma: bu dosya + `AGENTS.md` + `WIM_AI.md` (AI kartıysa) + `STYLEGUIDE.md` (UI kartıysa).

Ürün: desk OS + notebook. Hero doğru kalsın. Yjs yok. App Router yok. İkinci orchestrator yok. Lemon/Quill/Squeak/`@posthog/icons` isim yüzünden silinmez.

Explicit UI policy: Mevcut UI chrome stillerini değiştirme; STYLEGUIDE sadece eklenecek (additive) UI'lar içindir (Do not restyle existing chrome).

Jules PR kuralları: latest `main`; asla `commit.txt` / `commit2.txt` / `commit_message.txt` / `plan.md` / `description.txt` / `title.txt`; `package.json` / `pnpm-lock.yaml`'a canvas veya alakasız dep ekleme; `AI_MEMORY.md` / `.jules/bolt.md` dokunma (bu kart değilse); tek concern.

---

## A. GELİŞTİR — açık

### A6 — App.tsx split
**Dosya:** `src/context/App.tsx` (~3000 satır).
**Yap:** `useWindowRegistry.ts`, `useShellNav.ts`, `useAuthBridge.ts` (veya eşdeğer) — davranış 0, export aynı.
**Yapma:** WindowMode semantiğini bu PR'da değiştirme.
**Bitti:** `pnpm typecheck:shell`; smoke; pencere aç/kapa.

### A10 — annotate_notebook event gap
**Dosya:** `src/components/ClaudeWorkspaceChat/index.tsx`, `src/notebook-app/App.tsx`.
**Yap:** Ask AI `wimNotebookAddAnnotation` dispatch ediyor ama notebook App tarafında bu event'i dinleyen (listener) kimse yok.
**Bitti:** Annotation listener eklendi.

### A11 — replace_notebook_selection / Diff Apply silent-append gap
**Dosya:** `src/notebook-app/App.tsx` (`handleReplaceSelection`).
**Yap:** Seçim bulamazsa sessizce metnin sonuna append yapıyor. Eğer seçim yoksa/fail olursa bunu fail-closed olarak yönet.
**Bitti:** Append yerine doğru bir fallback/hata yönetimi.

### A12 — Diff Split View dead wimArrangeWorkspace listener
**Dosya:** `src/components/ClaudeWorkspaceChat/components/ChatMessage.tsx` ve `src/context/App.tsx` veya ilgili yer.
**Yap:** `wimArrangeWorkspace` dispatch ediliyor (`detail: { preset: 'split_dual' }`) ama dinleyeni yok. Listener'ı ekle.
**Bitti:** Split view çalıştığında pencereler `split_dual` şeklinde düzenleniyor.

---

## B. EKLE — açık

### B13 — export_notebook include_footnotes unused
**Dosya:** `src/lib/bots/tools/execute.ts`.
**Yap:** `executeExportNotebook` fonksiyonunda `_includeFootnotes` parametresi var ancak kullanılmıyor (unused/ölü).
**Bitti:** Dipnotlar markdown/html/latex derlemesine dahil ediliyor veya ölü kod kaldırıldı.

### B14 — arrange studio preset path mismatch
**Dosya:** `src/lib/bots/tools/execute.ts`.
**Yap:** `executeArrangeWorkspacePreset` içinde `studio` preset'i için `rightPath` `/workspace` olarak atanmış ancak WIM AI yolu `/workspace-chat` olmalı.
**Bitti:** `studio` preset yolu düzeltildi.

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

B14 → A12 → A10 → A11 → B13 → A6 → E1 → E2.

---

## Verify

```bash
pnpm typecheck:shell
pnpm test:smoke
```

Kart notebook ise: `pnpm exec playwright test tests/notebook-frontend.spec.ts tests/keyboard-overlay.spec.ts`  
Kart pencere ise: `tests/chrome.spec.ts`
