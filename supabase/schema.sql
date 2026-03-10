-- =============================================================
-- THE ULTIMATE WORLD IN MAKING SCHEMA (Production-Proof)
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

-- 5. THE BLOG SYSTEM (Added all missing frontend fields: ribbon, excerpt, etc.)
CREATE TABLE IF NOT EXISTS public.posts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug        TEXT UNIQUE NOT NULL,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    excerpt     TEXT,
    description TEXT, -- Added for frontend compatibility
    category    TEXT DEFAULT 'General',
    image_url   TEXT,
    image       TEXT, -- Duplicate for frontend image vs image_url mismatch
    ribbon      TEXT DEFAULT '#1E2F46', -- The ribbon color from usePosts.ts
    author      TEXT, -- Name of the author
    author_avatar TEXT, -- Avatar of the author
    author_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_approved BOOLEAN DEFAULT false,
    published   BOOLEAN DEFAULT false,
    language    TEXT DEFAULT 'en',
    translations JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 6. VOTING & SOCIAL
CREATE TABLE IF NOT EXISTS public.post_votes (
    id          SERIAL PRIMARY KEY,
    post_slug   TEXT NOT NULL,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote        INT NOT NULL CHECK (vote IN (-1, 0, 1)),
    UNIQUE(post_slug, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_post_votes (
    id          SERIAL PRIMARY KEY,
    post_id     INT NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote        INT NOT NULL CHECK (vote IN (-1, 0, 1)),
    UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_reply_votes (
    id          SERIAL PRIMARY KEY,
    reply_id    INT NOT NULL REFERENCES public.community_replies(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote        INT NOT NULL CHECK (vote IN (-1, 0, 1)),
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
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 8. COMPATIBILITY VIEWS (This fixes "relation not found" in code)
CREATE OR REPLACE VIEW community_posts_with_stats WITH (security_invoker = true) AS
SELECT p.*, 
    (SELECT COALESCE(SUM(v.vote), 0) FROM community_post_votes v WHERE v.post_id = p.id) as total_votes,
    (SELECT COUNT(*) FROM community_replies r WHERE r.post_id = p.id) as reply_count
FROM community_posts p;

-- 9. SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "profiles_read" ON public.profiles FOR SELECT USING (true);
    CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    CREATE POLICY "nodes_owner" ON public.nodes FOR ALL USING (auth.uid() = author_id);
    CREATE POLICY "posts_universal_read" ON public.posts FOR SELECT USING (published = true OR auth.uid() = author_id OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    CREATE POLICY "saved_posts_owner" ON public.user_saved_posts FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 10. NEW USER AUTOMATION
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

-- FINAL STEP: SETUP YOUR ADMIN
UPDATE public.profiles SET role = 'admin' WHERE id IN (SELECT id FROM auth.users WHERE email = 'dursunkayamustafa@gmail.com');
