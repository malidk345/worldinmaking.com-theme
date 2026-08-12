-- WorldInMaking (WIM) Complete Supabase Master Schema Migration
-- Safe to re-run multiple times (Idempotent: uses IF NOT EXISTS & guarded policies)

-- ── 1. PROFILES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    username text UNIQUE,
    first_name text,
    last_name text,
    avatar_url text,
    bio text,
    is_member boolean NOT NULL DEFAULT true,
    is_moderator boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── 2. WIM NOTEBOOKS & HISTORY ──────────────────────────────────────────────
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
    auth_user_id uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
    created_by jsonb NULL,
    last_modified_by jsonb NULL
);

ALTER TABLE public.wim_notebooks ADD COLUMN IF NOT EXISTS auth_user_id uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS wim_notebooks_short_id_uidx ON public.wim_notebooks (short_id);
CREATE INDEX IF NOT EXISTS wim_notebooks_owner_key_idx ON public.wim_notebooks (owner_key);
CREATE INDEX IF NOT EXISTS wim_notebooks_auth_user_id_idx ON public.wim_notebooks (auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS wim_notebooks_updated_at_idx ON public.wim_notebooks (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.wim_notebook_history (
    id bigserial PRIMARY KEY,
    notebook_id text NOT NULL REFERENCES public.wim_notebooks (id) ON DELETE CASCADE,
    version integer NOT NULL,
    content text NOT NULL,
    title text NULL,
    "timestamp" timestamptz NOT NULL DEFAULT now(),
    label text NULL
);

CREATE INDEX IF NOT EXISTS wim_notebook_history_notebook_id_idx ON public.wim_notebook_history (notebook_id, "timestamp" DESC);

-- ── 3. USER SOCIAL INTERACTION (SAVED POSTS, LIKES, VOTES) ───────────────────
CREATE TABLE IF NOT EXISTS public.user_saved_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    post_id text NOT NULL,
    post_slug text,
    title text,
    description text,
    url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.post_likes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    post_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.post_votes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    post_id text NOT NULL,
    vote_type text NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, post_id)
);

-- ── 4. COMMUNITY & FORUM ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_posts (
    id bigserial PRIMARY KEY,
    title text NOT NULL,
    content text NOT NULL,
    author_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    author_name text,
    channel_id bigint,
    post_slug text,
    inner_thoughts text,
    view_count integer NOT NULL DEFAULT 0,
    category text DEFAULT 'general',
    pinned boolean DEFAULT false,
    upvotes integer DEFAULT 0,
    reply_count integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_replies (
    id bigserial PRIMARY KEY,
    post_id bigint NOT NULL REFERENCES public.community_posts (id) ON DELETE CASCADE,
    author_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    author_name text,
    content text NOT NULL,
    inner_thoughts text,
    upvotes integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_post_votes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    post_id bigint NOT NULL REFERENCES public.community_posts (id) ON DELETE CASCADE,
    vote_type text NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.community_reply_votes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    reply_id bigint NOT NULL REFERENCES public.community_replies (id) ON DELETE CASCADE,
    vote_type text NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, reply_id)
);

-- ── 5. AI AGENTS & PHILOSOPHER BOTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bot_profiles (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text,
    api_token text UNIQUE NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_metadata (
    agent_id text PRIMARY KEY,
    name text NOT NULL,
    role text,
    persona jsonb,
    memory jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'idle',
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_relationships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id text NOT NULL,
    target_agent_id text NOT NULL,
    relationship_type text NOT NULL,
    score numeric DEFAULT 0,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS channel_id bigint;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS post_slug text;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS inner_thoughts text;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.community_replies ADD COLUMN IF NOT EXISTS inner_thoughts text;

ALTER TABLE public.agent_relationships ADD COLUMN IF NOT EXISTS notes text;

CREATE TABLE IF NOT EXISTS public.agent_action_log (
    id bigserial PRIMARY KEY,
    agent_id text NOT NULL,
    action_type text NOT NULL,
    details jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 6. ROW LEVEL SECURITY (RLS) POLICIES ─────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wim_notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wim_notebook_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reply_votes ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can view, user can edit own
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Notebooks: Public can view published, authenticated users access own
DROP POLICY IF EXISTS "wim_notebooks_select" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_select" ON public.wim_notebooks FOR SELECT USING (is_published = true OR auth_user_id = auth.uid());

DROP POLICY IF EXISTS "wim_notebooks_insert" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_insert" ON public.wim_notebooks FOR INSERT WITH CHECK (auth_user_id = auth.uid() OR auth_user_id IS NULL);

DROP POLICY IF EXISTS "wim_notebooks_update" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_update" ON public.wim_notebooks FOR UPDATE USING (auth_user_id = auth.uid() OR auth_user_id IS NULL);

DROP POLICY IF EXISTS "wim_notebooks_delete" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_delete" ON public.wim_notebooks FOR DELETE USING (auth_user_id = auth.uid() OR auth_user_id IS NULL);

-- Saved Posts & Likes: Own rows only
DROP POLICY IF EXISTS "user_saved_posts_all" ON public.user_saved_posts;
CREATE POLICY "user_saved_posts_all" ON public.user_saved_posts FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "post_likes_all" ON public.post_likes;
CREATE POLICY "post_likes_all" ON public.post_likes FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "post_votes_all" ON public.post_votes;
CREATE POLICY "post_votes_all" ON public.post_votes FOR ALL USING (user_id = auth.uid());

-- Community: Public read, authenticated write
DROP POLICY IF EXISTS "community_posts_select" ON public.community_posts;
CREATE POLICY "community_posts_select" ON public.community_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "community_posts_insert" ON public.community_posts;
CREATE POLICY "community_posts_insert" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "community_replies_select" ON public.community_replies;
CREATE POLICY "community_replies_select" ON public.community_replies FOR SELECT USING (true);

DROP POLICY IF EXISTS "community_replies_insert" ON public.community_replies;
CREATE POLICY "community_replies_insert" ON public.community_replies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
