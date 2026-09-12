# WorldInMaking — site eylem planı

**Kanonik.** Ajanlar sadece bunu + `AGENTS.md` + `AI_MEMORY.md` §4 + AI işinde `WIM_AI.md` okur.
**Tarih:** 2026-09-13  
**Repo:** `malidk345/worldinmaking.com-theme`  
**Hero:** *Sign in, write a note, and it stays on every device you use. That is the product.*

Ağustos performans raporu **silindi**. Plan/backlog stub dosyaları **silindi**. Bu belge onların yeridir.

---

## Nasıl kullanılır

1. §1–2 ürün ve yüzey envanteri — neyin ne olduğunu buradan öğren.
2. §3 durum (done / half / hole / leftover).
3. §4 faz + kart — tek PR, belirtilen glob.
4. Bitince `AI_MEMORY` §5. Sonraki ajan §4 kilidine bakar.

Yasak (her kartta): App Router, Yjs, ikinci orchestrator, `git add -A`, npm, Lemon/Quill/Squeak/icons silme, placeholder testini silme, global tsc tek committe kırmızı.

---

## 1. Ürün ve mimari

Tarayıcıda yazı OS'u. **desk** ücretsiz, **study** `profiles.role = pro`.

```
_app → AppProvider (src/context/App.tsx ~108KB)
  → Wrapper → TaskBar + Desktop + AppWindow listesi
       AppWindow = WindowChrome + WindowRouter + snap + error boundary
```

**Stack:** Next 14 Pages Router, React 18, Tailwind 3, pnpm 10, Node 22, Supabase.
**Prod:** Cloudflare Pages. Cron: `.github/workflows/philosopher-bots-cron.yml`.
**CI:** `typecheck:shell` + Playwright smoke (`placeholder.supabase.co`, `WIM_SKIP_ENV_HARD_FAIL=1`).

Notebook: Lemon + Quill, `.notebook-app-scope` / `LemonScope`. Senkron: markdown + version + three-way merge + tombstone + presence. **Yjs yok.**
AI: tek `src/lib/bots/orchestrate.ts`. Chat Edge SSE `/api/chat`.
Görsel: `STYLEGUIDE.md` tokenleri. Stok `bg-blue-500` yasak. WindowRouter login dalında `bg-slate-950/90` — token kaçağı.

---

## 2. Tam yüzey envanteri (koddan, 2026-09-13)

### 2.1 WindowRouter (`src/components/AppWindow/WindowRouter.tsx`)

| Path | Bileşen | Not |
|---|---|---|
| `/about` | AboutContent | |
| `/archive` | ArchiveWindow | |
| `/contact` | ContactWindow | |
| `/pricing` | PricingWindow | WIM / Lemon |
| `/home` | HomeWindow | `/` değil |
| `/account` | AccountWindow | |
| ask-ai / workspace-chat | AskAiWindow | |
| `/scratchpad*` | ScratchpadWindow | |
| `/trash*` | TrashWindow | |
| `/assistant*` | AssistantWindow | |
| `/admin` `/community/admin` | AdminDashboard | + 30KB API |
| `/tape-player` `/mixtapes` | TapePlayer | miras; grep |
| `/login` `/signup` | WimAuthPortal | `bg-slate-950` kaçağı |
| `/auth*` | null | callback ayrı sayfa |
| `/manifesto` `/about-wim` `/world-in-making` | **null** | ölü — redirect |
| `/display-options` | DisplayOptions | |
| `/bookmarks` | Bookmarks | |
| `/notifications` `/community/notifications` | notifications | |
| `/ideas` `/blueprints` | IdeasHub | miras |
| profil | Profile | |
| `/notebooks*` | **NotebooksListSkeleton** | editor `[...slug]`; iskelet kalmasın |
| `/questions` `/forum` `/community*` | Inbox / Squeak | |
| `/blog` `/posts` | PostListing | |
| `/blog/*` `/posts/*` | BlogPost | path ile body |
| LEGAL_PATHS | Legal | |
| diğer | placeholder “content for {key}” | |

Posts/questions path-first (F5 boş kabuk).

### 2.2 Sayfalar (`src/pages`, API hariç)

Home: `index`, `desktop` (ince), `DesktopPage/{Hero,LatestWriting,NotebookCTA,PhilosopherExplainer,FeatureBento,ManifestoStrip}`.
Auth: `login`, `signup`, `reset-password`, `auth/callback`.
Yazı: `posts/*`, `posts/new`, `posts/[slug]/edit`, `blog/*`.
Notebook: `notebooks/index`, `[...slug].tsx`.
Forum: `questions/index`, `[permalink]`, `subscriptions`, `questions/topic/max` (PostHog adı).
Topluluk: `community*`, `profile*`.
OS wrapper (~150B): account, admin, archive, assistant, bookmarks, contact, home, pricing, trash, workspace-chat, share, share/[token], room/[token].
Legal: terms, privacy, cookies, guidelines, copyright, refund, subprocessors, **baa ~141B stub**, **dpa stub**.
Diğer: about (dolu), kbd, 404.js 176B.

### 2.3 API

Search; notebooks CRUD + upload; co-author / collaborators / invite / invite-comment / inline-edit; forum edit/resolve/bot-react; chat + quota + chats; byok/verify; bots act/intent/search/diag; philosopher + cron + bot-queue; admin dashboard 30KB; billing checkout/cancel/status + Lemon webhook; account claim/delete/export; seo sitemap/rss; share + rooms; contact; repair-ui.

### 2.4 Taskbar

Blog, WIM AI, Assistant, Forums, About, Terms, Privacy, Display options, Keyboard shortcuts. `SmallTeamsMenuItems.tsx` adı miras — grep.

---

## 3. Durum

**Done:** home split, desktop redirect, post FTS, Next Image, window parçaları, notebook claim/fetch/poll/clobber/presence, tek orchestrator, Lemon kodu, sitemap+rss (post/soru/profil), PWA meta, typecheck:shell, Playwright, CI smoke.

**Half:** çift cihaz (CI kanıtlamaz); path-first kısmi; notebook pencerede skeleton; SEO json-ld yok; Lemon env yok; kota isolate-memory; BYOK header uyuşmaz; admin authz belirsiz; share/rooms testsiz; legal stub; AGENTS hâlâ silinmiş Ağustos dosyasını gösteriyordu (düzelt).

**Hole:** AboutPostHog ReaderView; WindowRouter null manifesto path; topic/max; slate-950 login; sitemap notebook yok; App.tsx 108KB; build ignore; Django security.md; AI_MEMORY 118KB.

**Leftover yük:** notebook-app, lemon-ui, quill, icons, LemonScope, OS chrome, Squeak.
**Leftover aday (0 import sonra sil):** HedgehogMode, CompensationCalculator, ContactSales, SalesforceForm, Merch, MaxCTA, SignupCTA, StarRepoButton, DocsPageSurvey, PlatformInstall, HogMap, TapePlayer/Ideas eğer menüde yoksa.
Pricing WIM. posthog.com preconnect = analytics kararı.

---

## 4. Faz + kart

```
Title: [Faz.N] fiil
Why: kullanıcının gördüğü
Read: WIM_REPORT + WIM_AI (AI) + AI_MEMORY §4
Touch: glob
Verify: typecheck:shell + spec
Log: AI_MEMORY §5
```

**Faz 0 Kimlik**
0.1 AboutPostHog / ReaderView → WIM. Kabul: o cümle yayında yok.
0.2 Import grafiği (silme yok).
0.3 0-import silme, ayrı PR.
0.4 manifesto/about-wim/world-in-making → /about.
0.5 questions/topic/max → /questions.
0.6 login slate → token.
0.7 STYLEGUIDE başlık.
0.8 AGENTS.md Ağustos linkini WIM_REPORT yap.

**Faz 1 Vaad**
1.1 Canlı NOTEBOOK_MULTI_DEVICE 10 madde.
1.2 Sadece kırık senkron. Yjs yok.
1.3 `/notebooks*` skeleton → gerçek liste.

**Faz 2 OS**
2.1 App.tsx hook split.
2.2 canonicalWindowPath her addWindow.
2.3 Playwright 6 yüzey × taskbar/F5/iç × 375.

**Faz 3 Keşif + study**
3.1 Sitemap published notebook.
3.2 json-ld.
3.3 baa/dpa metin veya çıkar.
3.4 Lemon env (ops).
3.5 Quota = profiles.role.

**Faz 4 AI**
4.1 Kalıcı 429.
4.2 BYOK header/tip.
4.3 Cron idempotency.
4.4 10 prompt eval (PR değil).

**Faz 5 sonra:** TR lang, Ideas/Tape kararı, community FTS, SW yok designsız, repair-ui belge, vercel.json, AI_MEMORY arşiv.

---

## 5. Verify

```bash
pnpm typecheck:shell
pnpm test:smoke
pnpm exec playwright test tests/notebook-frontend.spec.ts tests/keyboard-overlay.spec.ts tests/chrome.spec.ts tests/billing.spec.ts tests/next-image-hosts.spec.ts tests/notebook-authz.spec.ts
```

Placeholder kırmızısı = canlı proje yok, test çöp değil.

---

## 6. Ölçüt

Çift cihaz kayıp 0. Boş pencere 0. About PostHog 0. Notebook iskelet sonsuz 0. Sitemap notebook (yayın varsa). typecheck yeşil. Study → pro. 429 isolate ötesi. Manifesto null 0.

---

## 7. Sınır

0.2 import grafiği henüz yok — üret, bu dosyaya ekle.
1.1 canlı koşulmadı.
Lemon sırları okunmadı.
Faz bitince §3'ü güncelle; yeni rapor dosyası açma.
