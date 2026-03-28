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

-- 2. HARDENING & MIGRATION SECTION
-- Bu bölüm, kolonlar eksikse veri kaybı olmadan ekler ve hataları izole eder.

-- 1. community_posts tablosu için post_slug kolonu
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='community_posts' AND column_name='post_slug') THEN
        ALTER TABLE public.community_posts ADD COLUMN post_slug TEXT;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_posts_post_slug_key') THEN
        ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_post_slug_key UNIQUE (post_slug);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. post_votes tablosu için post_slug kolonu
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='post_votes' AND column_name='post_slug') THEN
        ALTER TABLE public.post_votes ADD COLUMN post_slug TEXT NOT NULL DEFAULT 'temp';
        ALTER TABLE public.post_votes ALTER COLUMN post_slug DROP DEFAULT;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='post_votes' AND column_name='vote') THEN
        ALTER TABLE public.post_votes ADD COLUMN vote INT NOT NULL DEFAULT 0 CHECK (vote >= -5 AND vote <= 5);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'post_votes_post_slug_user_id_key') THEN
        ALTER TABLE public.post_votes ADD CONSTRAINT post_votes_post_slug_user_id_key UNIQUE (post_slug, user_id);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2.1 community_post_votes tablosu için vote kolonu (Gelecekteki hatalara karşı koruma)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='community_post_votes' AND column_name='vote') THEN
        ALTER TABLE public.community_post_votes ADD COLUMN vote INT NOT NULL DEFAULT 0 CHECK (vote IN (-1, 0, 1));
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2.2 community_reply_votes tablosu için vote kolonu
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='community_reply_votes' AND column_name='vote') THEN
        ALTER TABLE public.community_reply_votes ADD COLUMN vote INT NOT NULL DEFAULT 0 CHECK (vote IN (-1, 0, 1));
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 3. user_saved_posts tablosu için post_slug kolonu
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='user_saved_posts' AND column_name='post_slug') THEN
        ALTER TABLE public.user_saved_posts ADD COLUMN post_slug TEXT NOT NULL DEFAULT 'temp';
        ALTER TABLE public.user_saved_posts ALTER COLUMN post_slug DROP DEFAULT;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_saved_posts_user_id_post_slug_key') THEN
        ALTER TABLE public.user_saved_posts ADD CONSTRAINT user_saved_posts_user_id_post_slug_key UNIQUE (user_id, post_slug);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. view_count kolonu (blog ve community posts için)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='posts' AND column_name='view_count') THEN
        ALTER TABLE public.posts ADD COLUMN view_count INT NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='community_posts' AND column_name='view_count') THEN
        ALTER TABLE public.community_posts ADD COLUMN view_count INT NOT NULL DEFAULT 0;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 3. ENHANCED PROFILES
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

-- 4. NODES (The Corpus System)
CREATE TABLE IF NOT EXISTS public.nodes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title       TEXT DEFAULT 'Untitled Node',
    content     TEXT,
    status      TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 5. FORUM INFRASTRUCTURE
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

-- 6. THE BLOG SYSTEM
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

-- 7. VOTING SYSTEM
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

-- 8. SAVED POSTS & APPLICATIONS
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

-- 9. COMPATIBILITY VIEWS
DO $$ 
BEGIN
    BEGIN
        DROP VIEW IF EXISTS public.community_posts_with_stats CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    BEGIN
        DROP VIEW IF EXISTS public.community_replies_with_stats CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'community_likes' AND table_schema = 'public' AND table_type = 'BASE TABLE') THEN
            DROP TABLE IF EXISTS public.community_likes CASCADE;
        END IF;
        DROP VIEW IF EXISTS public.community_likes CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

CREATE OR REPLACE VIEW public.community_posts_with_stats WITH (security_invoker = true) AS
SELECT p.*, 
    (SELECT COALESCE(SUM(v.vote), 0) FROM community_post_votes v WHERE v.post_id = p.id) as total_votes,
    (SELECT COUNT(*) FROM community_replies r WHERE r.post_id = p.id) as reply_count
FROM public.community_posts p;

CREATE OR REPLACE VIEW public.community_replies_with_stats WITH (security_invoker = true) AS
SELECT r.*, 
    (SELECT COALESCE(SUM(v.vote), 0) FROM community_reply_votes v WHERE v.reply_id = r.id) as total_votes
FROM public.community_replies r;

CREATE OR REPLACE VIEW public.community_likes WITH (security_invoker = true) AS
SELECT post_id as id, count(*) as count
FROM public.community_post_votes
WHERE vote > 0
GROUP BY post_id;

-- 10. INDEXES
CREATE INDEX IF NOT EXISTS idx_post_votes_slug ON post_votes(post_slug);
CREATE INDEX IF NOT EXISTS idx_com_post_votes_id ON community_post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_nodes_status ON public.nodes(status);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (lower(username));
CREATE INDEX IF NOT EXISTS idx_com_posts_channel ON public.community_posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_com_replies_post ON public.community_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON public.user_saved_posts(user_id);

-- 11. RPC FUNCTIONS
CREATE OR REPLACE FUNCTION get_post_total_votes(post_slug_input TEXT)
RETURNS INT AS $$
    SELECT COALESCE(SUM(vote), 0)::INT FROM post_votes WHERE post_slug = post_slug_input;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_com_post_total_votes(post_id_input INT)
RETURNS INT AS $$
    SELECT COALESCE(SUM(vote), 0)::INT FROM community_post_votes WHERE post_id = post_id_input;
$$ LANGUAGE sql SECURITY DEFINER;

-- View Count Bumping RPCs
CREATE OR REPLACE FUNCTION increment_post_view(slug_input TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.posts SET view_count = view_count + 1 WHERE slug = slug_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_com_post_view(id_input INT)
RETURNS void AS $$
BEGIN
    UPDATE public.community_posts SET view_count = view_count + 1 WHERE id = id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reply_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writer_applications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    -- Profiles
    DROP POLICY IF EXISTS "profiles_read" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
    CREATE POLICY "profiles_read" ON public.profiles FOR SELECT USING (true);
    CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

    -- Nodes
    DROP POLICY IF EXISTS "nodes_owner" ON public.nodes;
    CREATE POLICY "nodes_owner" ON public.nodes FOR ALL USING (auth.uid() = author_id);

    -- Community Channels
    DROP POLICY IF EXISTS "channels_read" ON public.community_channels;
    CREATE POLICY "channels_read" ON public.community_channels FOR SELECT USING (true);

    -- Community Posts
    DROP POLICY IF EXISTS "com_posts_read" ON public.community_posts;
    DROP POLICY IF EXISTS "com_posts_insert" ON public.community_posts;
    DROP POLICY IF EXISTS "com_posts_update" ON public.community_posts;
    DROP POLICY IF EXISTS "com_posts_delete" ON public.community_posts;
    CREATE POLICY "com_posts_read" ON public.community_posts FOR SELECT USING (true);
    CREATE POLICY "com_posts_insert" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "com_posts_update" ON public.community_posts FOR UPDATE USING (auth.uid() = author_id OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    CREATE POLICY "com_posts_delete" ON public.community_posts FOR DELETE USING (auth.uid() = author_id OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

    -- Community Replies
    DROP POLICY IF EXISTS "com_replies_read" ON public.community_replies;
    DROP POLICY IF EXISTS "com_replies_insert" ON public.community_replies;
    DROP POLICY IF EXISTS "com_replies_update" ON public.community_replies;
    DROP POLICY IF EXISTS "com_replies_delete" ON public.community_replies;
    CREATE POLICY "com_replies_read" ON public.community_replies FOR SELECT USING (true);
    CREATE POLICY "com_replies_insert" ON public.community_replies FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "com_replies_update" ON public.community_replies FOR UPDATE USING (auth.uid() = author_id OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    CREATE POLICY "com_replies_delete" ON public.community_replies FOR DELETE USING (auth.uid() = author_id OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

    -- Posts
    DROP POLICY IF EXISTS "posts_read" ON public.posts;
    DROP POLICY IF EXISTS "posts_insert" ON public.posts;
    DROP POLICY IF EXISTS "posts_update" ON public.posts;
    DROP POLICY IF EXISTS "posts_delete" ON public.posts;
    CREATE POLICY "posts_read" ON public.posts FOR SELECT USING (published = true OR auth.uid() = author_id OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    CREATE POLICY "posts_insert" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    CREATE POLICY "posts_update" ON public.posts FOR UPDATE USING (auth.uid() = author_id OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    CREATE POLICY "posts_delete" ON public.posts FOR DELETE USING (auth.uid() = author_id OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

    -- Saved Posts
    DROP POLICY IF EXISTS "saved_posts_owner" ON public.user_saved_posts;
    CREATE POLICY "saved_posts_owner" ON public.user_saved_posts FOR ALL USING (auth.uid() = user_id);

    -- Post Votes
    DROP POLICY IF EXISTS "manage_own_post_votes" ON post_votes;
    DROP POLICY IF EXISTS "view_all_votes" ON post_votes;
    CREATE POLICY "manage_own_post_votes" ON post_votes FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "view_all_votes" ON post_votes FOR SELECT USING (true);

    -- Community Post Votes
    DROP POLICY IF EXISTS "view_com_post_votes" ON community_post_votes;
    DROP POLICY IF EXISTS "manage_own_com_post_votes" ON community_post_votes;
    CREATE POLICY "view_com_post_votes" ON community_post_votes FOR SELECT USING (true);
    CREATE POLICY "manage_own_com_post_votes" ON community_post_votes FOR ALL USING (auth.uid() = user_id);

    -- Community Reply Votes
    DROP POLICY IF EXISTS "view_com_reply_votes" ON public.community_reply_votes;
    DROP POLICY IF EXISTS "manage_own_com_reply_votes" ON public.community_reply_votes;
    CREATE POLICY "view_com_reply_votes" ON public.community_reply_votes FOR SELECT USING (true);
    CREATE POLICY "manage_own_com_reply_votes" ON public.community_reply_votes FOR ALL USING (auth.uid() = user_id);
    
    -- Writer Applications
    DROP POLICY IF EXISTS "writer_app_insert" ON public.writer_applications;
    DROP POLICY IF EXISTS "writer_app_admin" ON public.writer_applications;
    CREATE POLICY "writer_app_insert" ON public.writer_applications FOR INSERT WITH CHECK (true);
    CREATE POLICY "writer_app_admin" ON public.writer_applications FOR ALL USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 13. AUTOMATION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
BEGIN
  base_username := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  final_username := base_username;
  
  -- Prevent Unique Constraint Violations causing broken sign-ups
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    final_username := base_username || '_' || substr(md5(random()::text), 1, 4);
  END LOOP;

  INSERT INTO public.profiles (id, username, email, avatar_url, role)
  VALUES (new.id, final_username, new.email, new.raw_user_meta_data->>'avatar_url', 'member');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Protect is_approved from being edited by Authors
CREATE OR REPLACE FUNCTION restrict_is_approved()
RETURNS trigger AS $$
BEGIN
    IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
            NEW.is_approved = OLD.is_approved;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_restrict_is_approved ON public.posts;
CREATE TRIGGER trg_restrict_is_approved BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE PROCEDURE restrict_is_approved();

-- SECURITY: Protect 'role' in profiles from Privilege Escalation
CREATE OR REPLACE FUNCTION restrict_profile_role()
RETURNS trigger AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Only allow role changes if the user performing the change is ALREADY an admin
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
            NEW.role = OLD.role;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_restrict_profile_role ON public.profiles;
CREATE TRIGGER trg_restrict_profile_role BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE restrict_profile_role();

-- SECURITY: Protect 'author_id' from being reassigned by malicious users (Post Hijacking)
CREATE OR REPLACE FUNCTION restrict_author_id()
RETURNS trigger AS $$
BEGIN
    IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
        -- Users updating their own posts cannot transfer the authorship to someone else
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
            NEW.author_id = OLD.author_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_restrict_author_id_posts ON public.posts;
CREATE TRIGGER trg_restrict_author_id_posts BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE PROCEDURE restrict_author_id();

DROP TRIGGER IF EXISTS trg_restrict_author_id_nodes ON public.nodes;
CREATE TRIGGER trg_restrict_author_id_nodes BEFORE UPDATE ON public.nodes FOR EACH ROW EXECUTE PROCEDURE restrict_author_id();

DROP TRIGGER IF EXISTS trg_restrict_author_id_com_posts ON public.community_posts;
CREATE TRIGGER trg_restrict_author_id_com_posts BEFORE UPDATE ON public.community_posts FOR EACH ROW EXECUTE PROCEDURE restrict_author_id();

DROP TRIGGER IF EXISTS trg_restrict_author_id_com_replies ON public.community_replies;
CREATE TRIGGER trg_restrict_author_id_com_replies BEFORE UPDATE ON public.community_replies FOR EACH ROW EXECUTE PROCEDURE restrict_author_id();

-- FINAL STEP: ADMIN
UPDATE public.profiles SET role = 'admin' WHERE id IN (SELECT id FROM auth.users WHERE email = 'dursunkayamustafa@gmail.com');

-- 14. TRIGGERS for updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT c.table_name 
        FROM information_schema.columns c
        JOIN information_schema.tables tbl ON tbl.table_name = c.table_name AND tbl.table_schema = c.table_schema
        WHERE c.column_name = 'updated_at' 
          AND c.table_schema = 'public'
          AND tbl.table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
        EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()', t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;
