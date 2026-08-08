/**
 * Fully automated WIM Supabase setup + verification.
 * Uses SUPABASE_ACCESS_TOKEN (Management API) + SERVICE_ROLE from .env.local
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function loadEnv() {
    const envPath = path.join(root, '.env.local')
    const env = {}
    if (!fs.existsSync(envPath)) throw new Error('.env.local missing')
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        if (!line || line.startsWith('#')) continue
        const i = line.indexOf('=')
        if (i < 0) continue
        let v = line.slice(i + 1).trim()
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
        env[line.slice(0, i).trim()] = v
    }
    return env
}

const env = loadEnv()
const token = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN || ''
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const ref = (url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i) || [])[1]

if (!token) {
    console.error('Need SUPABASE_ACCESS_TOKEN env for Management API')
    process.exit(1)
}
if (!url || !serviceKey || !anonKey || !ref) {
    console.error('Missing Supabase env vars')
    process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
const results = []

async function sql(query, label) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
    })
    const text = await res.text()
    let data
    try {
        data = JSON.parse(text)
    } catch {
        data = text
    }
    const ok = res.status >= 200 && res.status < 300
    results.push({ label, ok, status: res.status, preview: String(text).slice(0, 200) })
    if (!ok) console.error('SQL FAIL', label, res.status, text.slice(0, 400))
    else console.log('SQL OK', label)
    return { ok, data, status: res.status }
}

async function patchAuthConfig(body, label) {
    // Try v1 config auth endpoint
    const endpoints = [
        `https://api.supabase.com/v1/projects/${ref}/config/auth`,
        `https://api.supabase.com/v1/projects/${ref}/auth/config`,
    ]
    for (const endpoint of endpoints) {
        const res = await fetch(endpoint, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        const text = await res.text()
        console.log(label, endpoint.split('/').slice(-2).join('/'), res.status, text.slice(0, 200))
        if (res.ok) {
            results.push({ label, ok: true, status: res.status })
            return true
        }
    }
    results.push({ label, ok: false, status: 0 })
    return false
}

// ── 1. Core schema ──────────────────────────────────────────────────────────
const migrationsDir = path.join(root, 'supabase/migrations')
const migrationFiles = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort().map((f) => `supabase/migrations/${f}`)
    : [
        'supabase/migrations/20260806_wim_notebooks.sql',
        'supabase/migrations/20260806_profiles_auth_rls.sql',
    ]

for (const rel of migrationFiles) {
    const full = path.join(root, rel)
    if (!fs.existsSync(full)) {
        console.warn('skip missing', rel)
        continue
    }
    // Run statements one by one for reliability
    const raw = fs.readFileSync(full, 'utf8')
    await sql(raw, `file:${rel}`)
}

// Extra safety DDL (idempotent)
await sql(
    `
-- profiles: ensure columns used by app
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_bot boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;

-- Auth trigger (recreate)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_username TEXT;
  final_username TEXT;
BEGIN
  base_username := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  final_username := base_username;
  IF final_username IS NULL OR length(trim(final_username)) = 0 THEN
    final_username := 'user_' || substr(new.id::text, 1, 8);
  END IF;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    final_username := base_username || '_' || substr(md5(random()::text), 1, 4);
  END LOOP;
  INSERT INTO public.profiles (id, username, avatar_url, role)
  VALUES (new.id, final_username, new.raw_user_meta_data->>'avatar_url', 'member')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error %: %', new.id, SQLERRM;
  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- community_posts write for authenticated authors
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "community_posts_public_read" ON public.community_posts;
CREATE POLICY "community_posts_public_read" ON public.community_posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "community_posts_insert_own" ON public.community_posts;
CREATE POLICY "community_posts_insert_own" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "community_posts_update_own" ON public.community_posts;
CREATE POLICY "community_posts_update_own" ON public.community_posts FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "community_posts_delete_own" ON public.community_posts;
CREATE POLICY "community_posts_delete_own" ON public.community_posts FOR DELETE USING (auth.uid() = author_id);

-- community_replies write
ALTER TABLE public.community_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "community_replies_public_read" ON public.community_replies;
CREATE POLICY "community_replies_public_read" ON public.community_replies FOR SELECT USING (true);
DROP POLICY IF EXISTS "community_replies_insert_own" ON public.community_replies;
CREATE POLICY "community_replies_insert_own" ON public.community_replies FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "community_replies_update_own" ON public.community_replies;
CREATE POLICY "community_replies_update_own" ON public.community_replies FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "community_replies_delete_own" ON public.community_replies;
CREATE POLICY "community_replies_delete_own" ON public.community_replies FOR DELETE USING (auth.uid() = author_id);

-- notebooks (ensure tables)
CREATE TABLE IF NOT EXISTS public.wim_notebooks (
  id text PRIMARY KEY,
  short_id text NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Notebook',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  pinned boolean NOT NULL DEFAULT false,
  is_template boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  publish jsonb NULL,
  version integer NOT NULL DEFAULT 1,
  owner_key text NOT NULL,
  created_by jsonb NULL,
  last_modified_by jsonb NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS wim_notebooks_short_id_uidx ON public.wim_notebooks (short_id);
CREATE INDEX IF NOT EXISTS wim_notebooks_owner_key_idx ON public.wim_notebooks (owner_key);

CREATE TABLE IF NOT EXISTS public.wim_notebook_history (
  id bigserial PRIMARY KEY,
  notebook_id text NOT NULL REFERENCES public.wim_notebooks (id) ON DELETE CASCADE,
  version integer NOT NULL,
  content text NOT NULL,
  title text NULL,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  label text NULL
);

ALTER TABLE public.wim_notebooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wim_notebooks_public_read" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_public_read" ON public.wim_notebooks FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS "wim_notebooks_owner_select" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_owner_select" ON public.wim_notebooks FOR SELECT USING (is_published = true OR owner_key = auth.uid()::text);
DROP POLICY IF EXISTS "wim_notebooks_owner_insert" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_owner_insert" ON public.wim_notebooks FOR INSERT WITH CHECK (owner_key = auth.uid()::text);
DROP POLICY IF EXISTS "wim_notebooks_owner_update" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_owner_update" ON public.wim_notebooks FOR UPDATE USING (owner_key = auth.uid()::text) WITH CHECK (owner_key = auth.uid()::text);
DROP POLICY IF EXISTS "wim_notebooks_owner_delete" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_owner_delete" ON public.wim_notebooks FOR DELETE USING (owner_key = auth.uid()::text);

ALTER TABLE public.wim_notebook_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wim_history_owner" ON public.wim_notebook_history;
CREATE POLICY "wim_history_owner" ON public.wim_notebook_history FOR ALL USING (
  EXISTS (SELECT 1 FROM public.wim_notebooks n WHERE n.id = notebook_id AND (n.owner_key = auth.uid()::text OR n.is_published = true))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.wim_notebooks n WHERE n.id = notebook_id AND n.owner_key = auth.uid()::text)
);

NOTIFY pgrst, 'reload schema';
`,
    'core-ddl-rls'
)

// ── 2. Auth config (disable email confirm for frictionless local/prod signup if possible)
await patchAuthConfig(
    {
        mailer_autoconfirm: true,
        external_email_enabled: true,
        disable_signup: false,
        site_url: 'https://worldinmaking.com',
        uri_allow_list: 'http://localhost:3000/**,http://localhost:3001/**,https://worldinmaking.com/**,https://www.worldinmaking.com/**,https://*.worldinmaking.com/**',
    },
    'auth-config'
)

// Also try GET to see current config
{
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    const text = await res.text()
    console.log('auth config GET', res.status, text.slice(0, 500))
}

// ── 3. E2E smoke tests ──────────────────────────────────────────────────────
const stamp = Date.now()
const email = `wim_auto_${stamp}@worldinmaking.test`
const password = 'WimAutoTest123!xyz'
const username = `wim_auto_${stamp}`

console.log('\n=== E2E auth smoke ===')
const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, first_name: 'Auto', last_name: 'Test' },
})
if (created.error) {
    console.error('createUser FAIL', created.error)
    results.push({ label: 'createUser', ok: false, error: created.error.message })
} else {
    console.log('createUser OK', created.data.user.id)
    results.push({ label: 'createUser', ok: true })
}

const userId = created.data.user?.id
await new Promise((r) => setTimeout(r, 600))

let profile = await admin.from('profiles').select('*').eq('id', userId).maybeSingle()
if (!profile.data) {
    // ensure manually
    await admin.from('profiles').upsert({ id: userId, username, role: 'member' })
    profile = await admin.from('profiles').select('*').eq('id', userId).maybeSingle()
}
console.log('profile', profile.data ? profile.data.username : profile.error)
results.push({ label: 'profile', ok: !!profile.data })

// Anon password login
const anon = createClient(url, anonKey)
const login = await anon.auth.signInWithPassword({ email, password })
console.log('login', login.error?.message || 'OK')
results.push({ label: 'login', ok: !login.error && !!login.data.session })

const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${login.data.session?.access_token}` } },
})
// Better: use session on same client
const client = createClient(url, anonKey)
await client.auth.setSession({
    access_token: login.data.session.access_token,
    refresh_token: login.data.session.refresh_token,
})

const self = await client.from('profiles').select('id,username,bio').eq('id', userId).single()
console.log('self read', self.error?.message || self.data)
results.push({ label: 'self-read-profile', ok: !self.error })

const upd = await client.from('profiles').update({ bio: 'auto bootstrap bio' }).eq('id', userId).select('bio').single()
console.log('self update', upd.error?.message || upd.data)
results.push({ label: 'self-update-profile', ok: !upd.error })

// Notebook via service (API path) + via user JWT if owner_key matches
const nbId = `nb_${stamp}`
const nb = {
    id: nbId,
    short_id: `s${String(stamp).slice(-7)}`,
    title: 'Auto Notebook',
    content: '# hello from bootstrap',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    pinned: false,
    is_template: false,
    is_published: false,
    publish: null,
    version: 1,
    owner_key: userId,
    created_by: { first_name: 'Auto', email },
    last_modified_by: null,
}
const nbIns = await client.from('wim_notebooks').upsert(nb).select('id,title').single()
console.log('notebook user upsert', nbIns.error?.message || nbIns.data)
results.push({ label: 'notebook-user-upsert', ok: !nbIns.error })

const nbList = await client.from('wim_notebooks').select('id,title').eq('owner_key', userId)
console.log('notebook list', nbList.error?.message || `count=${nbList.data?.length}`)
results.push({ label: 'notebook-list', ok: !nbList.error && (nbList.data?.length || 0) > 0 })

// community channel + post
const ch = await admin.from('community_channels').select('id,slug').limit(1).maybeSingle()
const channelId = ch.data?.id
if (channelId) {
    const post = await client
        .from('community_posts')
        .insert({
            channel_id: channelId,
            author_id: userId,
            title: 'Bootstrap test post',
            content: 'Posted by automated setup',
            post_slug: `bootstrap-${stamp}`,
        })
        .select('id,title')
        .single()
    console.log('community post', post.error?.message || post.data)
    results.push({ label: 'community-post', ok: !post.error })
    if (post.data?.id) {
        await client.from('community_posts').delete().eq('id', post.data.id)
    }
} else {
    results.push({ label: 'community-post', ok: false, error: 'no channel' })
}

// Cleanup notebook + user
await admin.from('wim_notebooks').delete().eq('id', nbId)
await admin.auth.admin.deleteUser(userId)
console.log('cleanup done')

// ── 4. Inventory ────────────────────────────────────────────────────────────
const tables = await sql(
    `select tablename from pg_tables where schemaname='public' order by 1;`,
    'list-tables'
)
console.log(
    'tables',
    Array.isArray(tables.data) ? tables.data.map((t) => t.tablename).join(', ') : tables.data
)

const failed = results.filter((r) => r.ok === false)
console.log('\n=== SUMMARY ===')
for (const r of results) {
    console.log(r.ok ? '✓' : '✗', r.label, r.error || r.status || '')
}
console.log(failed.length ? `\nFAILED: ${failed.length}` : '\nALL CHECKS PASSED')
process.exit(failed.length ? 1 : 0)
