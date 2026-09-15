# WIM_REPORT — ajan iş emirleri

Güncelleme: Latest audit @ main after #677 + multimodal worker client abort + read_document client AbortSignal + search_site client AbortSignal (#solo). Bitmiş kartlar bu dosyadan çıkarıldı — yeniden açma:
A1–A13 (A6 useWindowRegistry #664; A12 Diff Split + wimArrangeWorkspace #651; A13 annotate premature ack), B1–B6, B7 (Playwright window-routes), B9 (ARTIFACT_RECIPES), B10 (LemonScope Ask AI), B11 (ask_user composer), B12 (Ask/Plan/Execute UI), B13 (export include_footnotes), B14 (arrange studio path), C1 (Build ignore), C2 (AboutPostHog rename), C5 (Docs banners), C7 (STYLEGUIDE/AGENTS titles), SSRF parity, apply-gate, span/diff, OS path+ack, a11y live regions, Anthropic BYOK, WindowRouter `/auth`, OSActionCard EN+tokens, philosopher avatar tokens, composer quota, BlogPost json-ld, Forum publish compose prefill, WIM_AI.md refresh, OS draft helpers, LemonTable notebooks list restore, OS action cards narrowed (#634), annotate ack (#636), bridge tests (#637), WIM_REPORT prior refresh (#638/#649), App.tsx partial hook extract useShellNav+useAuthBridge (#640), snap on already-open windows (#641), stream abort tools (#642), path-family close/focus (#643), replace span_text through card (#644), Diff Apply real patch/span (#645), arrange unknown fail (#646), addWindow snap regression (#648), Diff Apply sticky selection (#650), Diff Split button + arrange listener (#651), sticky consume only on success (#652), Notebook OS fail-closed nacks (#653), livePathname null-safe (#654), snapped world snapshots (#655), typecheck shell allowlist (#656), ask_user test CI (#657), LaTeX footnote conversion (#658), eslint shell gate (#659), OS arrange/diff pure extractors (#660), Playwright wiring specs (#661), fail-closed footnote/replace + LaTeX whitespace + shell gates (#663), useWindowRegistry extract (#664), notebook OS dispatch retry until listener mounts (#666), Diff Apply fail-closed UX on dispatch/ack timeout (#667), ask_user answer history + arrange presets + fetch abort (#668), executeArrangeWorkspacePreset aligned to resolveWorkspacePresetLayout (split_dual→/workspace-chat, research→split). ask_user empty Enter no longer auto-Yes (#composer+#handleHumanRespond), web_search Stop aborts in-flight provider fetches (signal→searchWebSources), academic corpus OpenAlex/Crossref/arXiv client AbortSignal (#solo leftover after #675). multimodal Worker fetches (image/vision/transcribe/speech) honor client AbortSignal on Stop (#solo). read_document remote fetch honors client AbortSignal on Stop (#solo leftover after #675/#677/#678). search_site posts+community Supabase fetches honor client AbortSignal on Stop (#solo leftover after stream-abort).

Okuyan ajan: kilidi `AI_MEMORY.md` §4'e yaz, **tek kart** yap, `git add -A` yok, bitince §5 log.
Okuma: bu dosya + `AGENTS.md` + `WIM_AI.md` (AI kartıysa) + `STYLEGUIDE.md` (UI kartıysa).

Ürün: desk OS + notebook. Hero doğru kalsın. Yjs yok. App Router yok. İkinci orchestrator yok. Lemon/Quill/Squeak/`@posthog/icons` isim yüzünden silinmez.

Explicit UI policy: Mevcut UI chrome stillerini değiştirme; STYLEGUIDE sadece eklenecek (additive) UI'lar içindir (Do not restyle existing chrome).

Jules PR kuralları: latest `main`; asla `commit.txt` / `commit2.txt` / `commit_message.txt` / `plan.md` / `description.txt` / `title.txt`; `package.json` / `pnpm-lock.yaml`'a canvas veya alakasız dep ekleme; `AI_MEMORY.md` / `.jules/bolt.md` dokunma (bu kart değilse); tek concern.

---

## A. GELİŞTİR — açık

(Tüm açık A kartları tamamlandı)

---

## B. EKLE — açık

(Tüm açık B kartları tamamlandı)

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

E1 → E2.

---

## Verify

```bash
pnpm typecheck:shell
pnpm test:smoke
```

Kart notebook ise: `pnpm exec playwright test tests/notebook-frontend.spec.ts tests/keyboard-overlay.spec.ts`  
Kart pencere ise: `tests/chrome.spec.ts`
