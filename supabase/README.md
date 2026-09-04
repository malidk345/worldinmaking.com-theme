# Supabase (WIM)

**Source of truth:** live project inventory in [`docs/architecture/SUPABASE_LIVE_SCHEMA.md`](../docs/architecture/SUPABASE_LIVE_SCHEMA.md).  
Do **not** re-run `migrations/20260808_master_schema.sql` against production (column names there drift: `vote_type` vs live `vote integer`).

New environments: apply files in `migrations/` in filename order, ending with `20260907_schema_alignment.sql`.

## Notebooks migration

File: `migrations/20260806_wim_notebooks.sql`

Creates:

- `public.wim_notebooks` — markdown notebooks (owner_key scoped until auth)
- `public.wim_notebook_history` — version snapshots
- RLS: public SELECT for `is_published = true`; API uses service role for writes

### Apply (pick one)

**A. Dashboard**

1. Supabase project → SQL Editor  
2. Paste SQL from the migration file  
3. Run  

**B. Script + access token**

```bash
# Dashboard → Account → Access Tokens → generate (sbp_...)
set SUPABASE_ACCESS_TOKEN=sbp_...
node scripts/apply-notebook-migration.mjs
```

### Verify

```bash
node -e "const {createClient}=require('@supabase/supabase-js'); require('dotenv').config({path:'.env.local'}); const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); s.from('wim_notebooks').select('id').limit(1).then(r=>console.log(r.error||r.data));"
```

### App behavior (no UI change)

- Editor still reads/writes `localStorage` synchronously
- Every save/create/delete dual-writes to `/api/notebooks` (service role)
- On first `getNotebooks()`, background pull merges remote → local (last-write-wins by `updatedAt`)
- If tables are missing, API returns `503 MIGRATION_REQUIRED` and the app stays local-only
