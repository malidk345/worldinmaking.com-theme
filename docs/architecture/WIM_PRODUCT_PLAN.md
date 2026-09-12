# WorldInMaking — ürün planı

**Tarih:** 2026-09-13  
**Kod:** `malidk345/worldinmaking.com-theme` @ `main`  
**Kuzey yıldızı (sitenin kendi hero'su):** *Sign in, write a note, and it stays on every device you use. That is the product.* Yazı, forum ve AI notebook'tan sonra gelir.

Ajanlar: `AGENTS.md` + bu dosya + `WIM_ENGINEERING_BACKLOG.md`. Ağustos performans raporu yok sayılır.

---

## 1. Site ne?

WIM bir pazarlama sitesi değil, tarayıcıda **yazı masasüstü**.

| Yüzey | Ne işe yarar | Ana kod |
|---|---|---|
| OS kabuk | pencere, taskbar, wallpaper, display options | `App.tsx`, `AppWindow/*`, `TaskBarMenu`, `_document` theme script |
| Desk / home | hero + latest writing + notebook CTA + filozof açıklama | `src/pages/DesktopPage/*` |
| Notebook | asıl ürün; local-first + Supabase + merge | `src/notebook-app/**` |
| Scratchpad / trash / assistant | OS uygulamaları | `WindowRouter` path'leri |
| Posts | deneme / yazı | `/posts`, `BlogPost` |
| Forum | soru-cevap, Inbox | `/questions`, `Inbox`, Squeak kökü |
| Ask AI / WIM AI | workspace chat, persona, araçlar | `/api/chat`, `ClaudeWorkspaceChat`, `lib/bots` |
| Filozoflar | saatlik forum sesi | cron + `philosopher-bot` |
| Study | ücretli masa (`profiles.role = pro`) | Lemon, `PricingWindow` |
| Hesap | profil, iptal, sil | `AccountWindow` |

Ücretsiz katman **desk**, ücretli **study**. Quotas chat'te guest / member / pro diye zaten var.

Görsel sözleşme: `STYLEGUIDE.md` — token renkleri (`bg-primary`…), `data-scheme`, notebook **cam fanus** (`.notebook-app-scope` / `LemonScope`). Stok `bg-blue-500` yok. Lemon CSS asla `body`'ye çıkmaz.

---

## 2. Ne çalışıyor (planı şişirme)

- Home parçalanmış: `HeroSection`, `LatestWriting`, `NotebookCTA`, `PhilosopherExplainer`, `FeatureBento`, `ManifestoStrip`.
- `/desktop` → `/`.
- Public search post'larda Postgres FTS; diğerleri kısa alan `ilike`.
- Next Image AVIF/WebP.
- WindowRouter path-first (F5 boş kabuk sorunu bilinerek).
- Notebook: cihaz claim, açınca fetch, 30sn poll, yazarken ezmeme, presence kanal savunması.
- Tek AI orkestratörü. Billing kodu Lemon'a bağlı; anahtar yoksa sahte ödeme yok.
- Sitemap + RSS var. PWA meta var. CI: `typecheck:shell` + placeholder smoke.

Taskbar menü (gerçek): Blog, WIM AI, Assistant, Forums, About, Terms, Privacy, Display options, Keyboard shortcuts. `SmallTeamsMenuItems.tsx` adı PostHog kalıntısı — içerik kontrol edilmeden silinmez.

---

## 3. Ürünü bozan şeyler (sıra bu)

### A. Vaadi kıranlar — önce bunlar

Hero "her cihazda aynı not" diyor. Bu kırılırsa sitenin cümlesi yalan olur.

1. Canlı hesapla `NOTEBOOK_MULTI_DEVICE.md` 10 madde. CI bunu kanıtlamaz (`placeholder.supabase.co`).
2. Açık not + ikinci cihaz + focus/visibility. Dirty editor ezilmeyecek.
3. Guest yaz → login → notlar kaybolmayacak (`claimDevice`).
4. Silinen not B cihazında hortlamayacak (tombstone).

Kabul: telefon + laptop, aynı hesap, 5 dakika, 0 kayıp paragraf.

### B. Kimliği kıranlar — WIM değil PostHog görünmesin

1. `AboutPostHog` hâlâ ReaderView / MDX'e PostHog reklamı basıyor. **WIM about** veya kaldır.
2. `Html lang="en"` + hero İngilizce. Kitle TR ise en azından belge dili ve about/legal; tam i18n sonra.
3. Taskbar / ReaderView / footer'da hedgehog, careers, sales, merch yok edilmeli (grep sonra sil).
4. `_document` PostHog analytics preconnect: ölçüm bilinçliyse kalsın, değilse `posthog-js` ile birlikte çıksın.

Squeak, Lemon, Quill, icons: isim PostHog, iş WIM. Silinmez.

### C. OS'un kendisi — boş pencere = ürün ölümü

1. Her ürün yolu `canonicalWindowPath` + `WindowRouter`.
2. `App.tsx` 108KB — davranış değişmeden hook'lara böl.
3. `WindowMode` tek enum; boolean çorbası yok.
4. Test: taskbar, F5, iç nav, 375px + klavye. Forum, post, notebook, ask-ai, about, pricing.

### D. Keşif — yazının dışarıdan bulunması

Pencere JS'ine Google güvenmez.

1. Slug sayfasında düz okunur gövde + title/description.
2. Article json-ld (`src/lib/seo`).
3. Sitemap'e **yayımlanmış notebook** path'i (`notebookPublicPath`). Şu an yok.
4. `/dpa` sitemap'te, sayfa stub — yaz veya sitemap'ten çıkar.

### E. Study (para) — yeni özellik değil, fişi tak

Kod var: checkout, webhook, `profiles.role = pro`, Pricing penceresi, quota tablosu.

Eksik: canlı Lemon store + env + webhook + migration. Ürün eklemesi: Pricing kopyasının desk/study diline oturması, anahtar yokken ölü buton değil dürüst hata (docs: fail closed — bozma).

Pazar yeri, tipping, B2B dashboard **yok** bu planda.

### F. AI — ikinci beyin yok, ev sahibi sağlam olsun

- Tek `orchestrate.ts`.
- Stream'e quality-gate yapıştırma.
- Edge isolate kotası yetmez → kalıcı 429.
- Vault'taki deepseek/anthropic ya header'a çıkar ya tipten düşer.
- Filozof cron: idempotency + log. Forum'u çöpleme.
- Plan/execute kilidi (`modes.ts`) bozulmaz.

### G. Güven — sessiz regresyon

- Build hâlâ TS/ESLint yutuyor; CI allowlist duruyor. Global tsc tek PR değil.
- `AI_MEMORY.md` şişmiş; aylık arşiv.
- `docs/security.md` Django. WIM notu: service role public değil, search anon+RLS, fetch_url SSRF.

---

## 4. Fazlar (ajan bunu sırayla yürütür)

### Faz 0 — Kimlik (3–5 gün)

- AboutPostHog → WIM about veya kaldır.
- ReaderView otomatik blokquote envanteri.
- Görünür hedgehog/sales/merch grep + ölü klasör silme (import 0 ise).
- STYLEGUIDE başlığından "posthog.com" düşer.

Kabul: yayınlanmış bir yazıda "PostHog is the leading platform" yok.

### Faz 1 — Vaad (1 hafta)

- Canlı Supabase'te 10 maddelik checklist.
- Kırılan madde için küçük PR, Yjs yok.
- Claim + tombstone + dirty-guard regresyon testleri kalır.

Kabul: hero cümlesi doğru.

### Faz 2 — Pencere (1 hafta)

- App.tsx split.
- WindowMode + normalize.
- Playwright matris: 6 yüzey × 2 genişlik.

Kabul: F5 / taskbar / iç nav boş pencere 0.

### Faz 3 — Keşif + study fişi (paralel, 1 hafta)

- json-ld + notebook sitemap.
- Legal stub temizliği.
- Lemon prod env (insan / ops).
- Pricing metni desk/study.

Kabul: `/sitemap.xml` içinde en az bir public notebook örneği (varsa); checkout test kartıyla `role=pro`.

### Faz 4 — AI ev sahibi (sürekli, küçük PR)

- Kalıcı rate limit.
- BYOK tutarlılık.
- Cron idempotency.
- Eval set 10 prompt, haftalık, PR değil.

### Faz 5 — Bilerek sonra

TR UI, service worker, community FTS, e-posta bülteni, odak-modu bildirim filtresi, App.tsx sonrası daha fazla shell parçalama.

---

## 5. Ajan kartı şablonu

```
Title: [Faz.N] fiil
Why: kullanıcının gördüğü cümle
Read: bu plan + WIM_AI.md (AI ise) + AI_MEMORY §4
Touch: glob
Do not: Yjs, App Router, Lemon/Quill/Squeak silme, git add -A
Verify: typecheck:shell + ilgili spec
Accept: ölçülebilir
Log: AI_MEMORY §5
```

İlk üç kart:

1. `[0.1] ReaderView AboutPostHog → WIM` — `AboutPostHog`, ReaderView, mdxGlobalComponents.
2. `[1.1] Canlı çift cihaz checklist` — kod yoksa rapor; kırıksa tek dosya PR.
3. `[2.1] App.tsx hook extract` — sıfır davranış değişikliği.

---

## 6. Bilerek yok

App Router, Yjs, Notion veritabanı ürünü, ikinci LLM yolu, kariyer/merch/salesforce, reklam ağı, CSP enforce envantersiz, global tsc kırmızısı tek commit, placeholder Supabase testini silmek.

---

## 7. Başarı ölçütü

| Ölçü | Hedef |
|---|---|
| Çift cihaz not kaybı | 0 (elle, canlı proje) |
| Boş pencere (6 yüzey) | 0 |
| Yayında "About PostHog" | 0 |
| Sitemap public notebook | var (ürün yayınlıyorsa) |
| typecheck:shell | CI yeşil |
| Study checkout | test mode → `pro` |
| Chat abuse | isolate ötesi 429 |

Bu plan ürünü büyütmez; vaadi doğru, kimliği WIM, masaüstünü sağlam, yazıyı bulunabilir, study'yi fişli yapar.
