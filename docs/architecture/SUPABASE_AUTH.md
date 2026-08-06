# WorldInMaking auth — Supabase only

PostHog.com code originally used Squeak/Strapi for community auth. **WIM uses Supabase exclusively.**

## Automated setup

```bash
# requires SUPABASE_ACCESS_TOKEN in env or .env.local (gitignored)
pnpm supabase:bootstrap
```

Script: `scripts/wim-supabase-bootstrap.mjs` — applies DDL/RLS, auth config (autoconfirm email, site URL, redirects), and runs e2e checks (signup/login/profile/notebook/community post).

## Flow

1. **Taskbar → “Sign in to the community”** opens `AuthModal` → email/password via `useUser` → `lib/wim-auth.ts` → Supabase Auth.
2. **`auth.users` insert** fires `handle_new_user` → `public.profiles` (`id = auth.uid()`, `role = member`).
3. **`useUser`** maps session + profile into site `User` shape.
4. **Session** in `localStorage`; `jwt` mirrors access_token; notebooks use `wim_auth_user_id`.
5. **Community write** uses user JWT + `author_id` (`supabaseCommunity.ts`).

## Key files

| File | Role |
|------|------|
| `src/lib/supabase.ts` | Browser client (anon key) |
| `lib/supabase-admin.ts` | Service role (API routes only) |
| `src/lib/wim-auth.ts` | Login/signup/profile map |
| `src/hooks/useUser.tsx` | React auth context |
| `supabase/migrations/20260806_profiles_auth_rls.sql` | Own-row profile RLS + notebook owner policies |
| `supabase/migrations/20260806_wim_notebooks.sql` | Notebook tables |

## Do not

- Point login at `NEXT_PUBLIC_SQUEAK_API_HOST` / `squeak.posthog.com`
- Fake a user in UI without a Supabase session
- Put service role key in client bundles

## Squeak cleanup status (WIM)

Core auth, profiles, community post/reply, bookmarks, likes, votes, and notebooks are on **Supabase only**.

### Defenses

1. **Client fetch guard** — `lib/squeak.ts` → `installSqueakFetchGuard()` in `context/App.tsx`  
   Blocks: `squeak.posthog.com`, `undefined/api/*`, and relative legacy Strapi paths (`/api/teams`, `/api/roadmaps`, …) when host is unset. Local Next APIs (`/api/notebooks`, `/api/forum`, …) stay allowed.
2. **Helpers** — `getSqueakApiHost()`, `squeakFetch()`, `isSqueakEnabled()`
3. **Call-site guards** — hot paths early-return when host is empty (community, media, team, events, hogmap, profile, OAuth buttons, etc.)
4. **Stubs** — `useTeam`, `useRoadmaps`, `useMediaLibrary`, `useMixtapes`, … return empty data
5. **OAuth** — `ConnectedAccounts` / `PostHogButton` no longer redirect to Squeak; toast only

### Still Squeak-shaped code (safe no-op without host)

Team admin, roadmaps write UI, merch, Zendesk, hedgehog generator, Edition CMS writers — kept for PostHog UI compatibility; they do not run network calls when host is empty.

### Blog / posts (Supabase-only)

| Surface | Source |
|---------|--------|
| `/posts`, `/blog` listing | `usePaginatedPosts` → `fetchSupabasePosts` |
| `/posts/[slug]` | `PostPage` → `fetchSupabasePostBySlug` |
| Catch-all blog-like paths | `[...slug]` `BlogPostContainer` → same |
| Spotlight search | `/api/search` → `searchSupabasePosts` |

No Squeak CMS, no mock fallback lists. Empty table → empty UI.

### Smoke

```bash
pnpm supabase:smoke
# or full bootstrap + e2e:
pnpm supabase:bootstrap
```

