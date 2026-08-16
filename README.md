# WorldInMaking (WIM)

Desktop OS shell product built on a Next.js (Pages Router) codebase inherited from PostHog.com.

**Stack:** Next.js 14 · React 18 · Tailwind 3 · Supabase · multi-provider AI · notebook-app (Lemon UI)

| | |
|---|---|
| **Product surface** | Desktop windows, taskbar, search, auth, notebooks, community/forum, AI bots |
| **Package manager** | **pnpm only** (`pnpm-lock.yaml`) — do not use npm or commit `package-lock.json` |
| **Node** | 22.x |
| **Architecture** | [`docs/architecture/FULL_PERFORMANCE_AND_GROWTH_REPORT.md`](docs/architecture/FULL_PERFORMANCE_AND_GROWTH_REPORT.md) |
| **AI agent board** | [`docs/architecture/AI_MEMORY.md`](docs/architecture/AI_MEMORY.md) |

---

## Quick start

```bash
# Prerequisites: Node 22+, pnpm 10+
pnpm install
cp .env.example .env.local   # fill Supabase keys (see below)
pnpm dev
```

Open:

- **Shell home:** [http://localhost:3000](http://localhost:3000) (renders desktop content)
- **Desktop route:** [http://localhost:3000/desktop](http://localhost:3000/desktop)
- **Login:** [http://localhost:3000/login](http://localhost:3000/login)

Notebook CSS is rebuilt on `predev` / `prebuild`. First `pnpm dev` may take longer.

---

## Environment

1. Copy [`.env.example`](.env.example) → `.env.local`.
2. Minimum for local shell:

   | Variable | Purpose |
   |----------|---------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server-only (notebooks, forum, bots) — never expose as `NEXT_PUBLIC_*` |

3. Optional: AI keys (`GROQ_*`, `GEMINI_*`, `OPENAI_*`), `CRON_SECRET` / `BOT_ACT_SECRET`.

Hourly philosopher posts are scheduled by [`.github/workflows/philosopher-bots-cron.yml`](.github/workflows/philosopher-bots-cron.yml) (not Vercel — production is Cloudflare Pages). The workflow POSTs `topic` then `reply` to `/api/cron/philosopher-bots`. Set the same `CRON_SECRET` on **both** Cloudflare Pages and the GitHub repo secrets, and enable scheduled Actions if this is a fork.

`lib/env.ts` **warns** when public keys are missing in dev; in **production runtime** it **fails hard** if required keys/secrets are absent (override with `WIM_SKIP_ENV_HARD_FAIL=1` only for CI smoke).

Bootstrap / smoke against a real project:

```bash
pnpm supabase:bootstrap   # needs SUPABASE_ACCESS_TOKEN + service role
pnpm supabase:smoke
```

Migrations live under [`supabase/migrations/`](supabase/migrations/).

---

## Common scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next dev server (rebuilds notebook styles first) |
| `pnpm build` / `pnpm start` | Production build & serve |
| `pnpm typecheck:shell` | Path-filtered TypeScript for core shell / API / bots |
| `pnpm test:smoke` | Playwright shell smoke (`/`, `/desktop`, `/login`, search, posts, forum) |
| `pnpm bot:worker` | Manual two-phase trigger of `/api/cron/philosopher-bots` |
| `pnpm pages:build` | Cloudflare `next-on-pages` (optional dual deploy) |

CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs `typecheck:shell` + Playwright smoke.

---

## Product map (high level)

```
_app → AppProvider (windows, nav, auth) → Wrapper
  ├─ TaskBar / Desktop / AppWindow list
  ├─ Search / Command palette / Auth (dynamic)
  └─ Footer / Chat overlay

Routes:  /  ·  /desktop  ·  /[...slug]  ·  /api/*
Data:    Supabase (auth, profiles, notebooks, community, posts)
AI:      lib/ai-provider · persona-engine · philosopher bots + cron
```

Key paths:

| Path | Role |
|------|------|
| `src/context/App.tsx` | Global shell state |
| `src/components/AppWindow/` | Window chrome / router |
| `src/pages/desktop.tsx` | Home content (sections in `DesktopPage/`) |
| `src/pages/api/` | Search, notebooks, forum, bots |
| `src/notebook-app/` | Isolated notebook product (lazy) |
| `src/lib/wim-auth.ts` | Supabase auth mapping |

---

## Multi-agent / contribution protocol

Multiple AI agents share this repo. **Before coding:**

1. Read [`docs/architecture/AI_MEMORY.md`](docs/architecture/AI_MEMORY.md) and the performance report.
2. Claim a `[NOT STARTED]` task on the board (`[IN PROGRESS by <name>]`).
3. Stay on that stream’s files; no broad `git add -A`.
4. On finish: mark `[COMPLETED]`, append a log entry in AI_MEMORY.

Human contributors: prefer small PRs aligned with those streams (Infra, Shell, Performance, Data, AI/Bots).

---

## What this repo is *not*

- Not the live PostHog.com marketing monorepo workflow (Gatsby-era docs in old READMEs are obsolete).
- Not a full App Router migration (deferred until the shell is clean).
- Not a free-for-all TypeScript lock on the whole tree — use **`pnpm typecheck:shell`** for the trusted core.

---

## License

MIT (see package metadata). Product branding and content are WorldInMaking unless otherwise noted.
