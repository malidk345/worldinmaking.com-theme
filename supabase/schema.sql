-- =============================================================
-- THE KUSURSUZ (FLAWLESS) MASTER SCHEMA & VOTING SYSTEM
-- =============================================================

-- 1. EXTENSIONS & UTILS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. ENHANCED PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username    TEXT UNIQUE NOT NULL,
    email       TEXT,
    avatar_url  TEXT,
    cover_url   TEXT,
    bio         TEXT,
    website     TEXT,
    github      TEXT,
    linkedin    TEXT,
    twitter     TEXT,
    pronouns    TEXT,
    location    TEXT,
    role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. NODES (The Corpus System)
CREATE TABLE IF NOT EXISTS public.nodes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title       TEXT DEFAULT 'Untitled Node',
    content     TEXT,
    status      TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 4. FORUM INFRASTRUCTURE
CREATE TABLE IF NOT EXISTS public.community_channels (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_posts (
    id          SERIAL PRIMARY KEY,
    channel_id  INT REFERENCES public.community_channels(id) ON DELETE SET NULL,
    author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    image_url   TEXT,
    post_slug   TEXT UNIQUE,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_replies (
    id          SERIAL PRIMARY KEY,
    post_id     INT NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 5. THE BLOG SYSTEM (All missing frontend fields included)
CREATE TABLE IF NOT EXISTS public.posts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug        TEXT UNIQUE NOT NULL,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    excerpt     TEXT,
    description TEXT,
    category    TEXT DEFAULT 'General',
    image_url   TEXT,
    image       TEXT,
    ribbon      TEXT DEFAULT '#1E2F46',
    author      TEXT,
    author_avatar TEXT,
    author_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_approved BOOLEAN DEFAULT false,
    published   BOOLEAN DEFAULT false,
    language    TEXT DEFAULT 'en',
    translations JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 6. VOTING SYSTEM (Matching frontend requirements: ArticleActions (-5 to +5) and useCommunity (+1/-1))
CREATE TABLE IF NOT EXISTS public.post_votes (
    id          SERIAL PRIMARY KEY,
    post_slug   TEXT NOT NULL,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote        INT NOT NULL CHECK (vote >= -5 AND vote <= 5),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(post_slug, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_post_votes (
    id          SERIAL PRIMARY KEY,
    post_id     INT NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote        INT NOT NULL CHECK (vote IN (-1, 0, 1)),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_reply_votes (
    id          SERIAL PRIMARY KEY,
    reply_id    INT NOT NULL REFERENCES public.community_replies(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote        INT NOT NULL CHECK (vote IN (-1, 0, 1)),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(reply_id, user_id)
);

-- 7. SAVED POSTS & APPLICATIONS
CREATE TABLE IF NOT EXISTS public.user_saved_posts (
    id          SERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_slug   TEXT NOT NULL,
    post_title  TEXT,
    saved_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, post_slug)
);

CREATE TABLE IF NOT EXISTS public.writer_applications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    message     TEXT NOT NULL,
    status      TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed')),
    source      TEXT,
    portfolio_url TEXT,
    social_handle TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 8. COMPATIBILITY VIEWS (Alias support for frontend)
DROP VIEW IF EXISTS public.community_posts_with_stats CASCADE;
CREATE OR REPLACE VIEW public.community_posts_with_stats WITH (security_invoker = true) AS
SELECT p.*, 
    (SELECT COALESCE(SUM(v.vote), 0) FROM community_post_votes v WHERE v.post_id = p.id) as total_votes,
    (SELECT COUNT(*) FROM community_replies r WHERE r.post_id = p.id) as reply_count
FROM public.community_posts p;

DROP VIEW IF EXISTS public.community_replies_with_stats CASCADE;
CREATE OR REPLACE VIEW public.community_replies_with_stats WITH (security_invoker = true) AS
SELECT r.*, 
    (SELECT COALESCE(SUM(v.vote), 0) FROM community_reply_votes v WHERE v.reply_id = r.id) as total_votes
FROM public.community_replies r;

DROP VIEW IF EXISTS public.community_likes CASCADE;
CREATE OR REPLACE VIEW public.community_likes WITH (security_invoker = true) AS
SELECT post_id as id, count(*) as count
FROM public.community_post_votes
WHERE vote > 0
GROUP BY post_id;

-- 9. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_post_votes_slug ON post_votes(post_slug);
CREATE INDEX IF NOT EXISTS idx_com_post_votes_id ON community_post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_nodes_status ON public.nodes(status);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (lower(username));

-- 10. RPC FUNCTIONS (For high performance voting lookups)
CREATE OR REPLACE FUNCTION get_post_total_votes(post_slug_input TEXT)
RETURNS INT AS $$
    SELECT COALESCE(SUM(vote), 0)::INT FROM post_votes WHERE post_slug = post_slug_input;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_com_post_total_votes(post_id_input INT)
RETURNS INT AS $$
    SELECT COALESCE(SUM(vote), 0)::INT FROM community_post_votes WHERE post_id = post_id_input;
$$ LANGUAGE sql SECURITY DEFINER;

-- 11. SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    -- Drop old policies to avoid duplicates
    DROP POLICY IF EXISTS "profiles_read" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
    CREATE POLICY "profiles_read" ON public.profiles FOR SELECT USING (true);
    CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

    DROP POLICY IF EXISTS "nodes_owner" ON public.nodes;
    CREATE POLICY "nodes_owner" ON public.nodes FOR ALL USING (auth.uid() = author_id);

    DROP POLICY IF EXISTS "posts_read" ON public.posts;
    CREATE POLICY "posts_read" ON public.posts FOR SELECT USING (published = true OR auth.uid() = author_id OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

    DROP POLICY IF EXISTS "saved_posts_owner" ON public.user_saved_posts;
    CREATE POLICY "saved_posts_owner" ON public.user_saved_posts FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "manage_own_post_votes" ON post_votes;
    DROP POLICY IF EXISTS "view_all_votes" ON post_votes;
    CREATE POLICY "manage_own_post_votes" ON post_votes FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "view_all_votes" ON post_votes FOR SELECT USING (true);

    DROP POLICY IF EXISTS "view_com_post_votes" ON community_post_votes;
    DROP POLICY IF EXISTS "manage_own_com_post_votes" ON community_post_votes;
    CREATE POLICY "view_com_post_votes" ON community_post_votes FOR SELECT USING (true);
    CREATE POLICY "manage_own_com_post_votes" ON community_post_votes FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 12. AUTOMATION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, avatar_url, role)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'username', new.email), new.email, new.raw_user_meta_data->>'avatar_url', 'member');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- FINAL STEP: ADMIN SETUP
UPDATE public.profiles SET role = 'admin' WHERE id IN (SELECT id FROM auth.users WHERE email = 'dursunkayamustafa@gmail.com');
