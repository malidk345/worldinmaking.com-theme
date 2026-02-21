-- ============================================================
--  worldinmaking.com — Complete Supabase Schema
--  Run this ONCE in Supabase Dashboard → SQL Editor
--  Safe to re-run: every statement is idempotent (IF NOT EXISTS)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. Extensions
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES  (extends Supabase auth.users)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username    TEXT,
    avatar_url  TEXT,
    role        TEXT DEFAULT 'member',
    bio         TEXT,
    website     TEXT,
    github      TEXT,
    linkedin    TEXT,
    twitter     TEXT,
    pronouns    TEXT,
    location    TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Add columns that might be missing on an existing table
DO $$ BEGIN
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS github TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pronouns TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
END $$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read profiles
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Profiles are viewable by everyone') THEN
        CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
    END IF;
END $$;

-- Users can insert their own profile
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Users can insert own profile') THEN
        CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Users can update their own profile
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, avatar_url, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        'member'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 2. POSTS  (blog posts)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title         TEXT NOT NULL,
    slug          TEXT UNIQUE NOT NULL,
    content       TEXT DEFAULT '',
    excerpt       TEXT,
    published     BOOLEAN DEFAULT false,
    category      TEXT DEFAULT 'General',
    image_url     TEXT,
    author        TEXT,
    author_avatar TEXT,
    ribbon        TEXT DEFAULT '#3546AB',
    translations  JSONB DEFAULT '{}',
    language      TEXT DEFAULT 'en',
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- Add columns that might be missing
DO $$ BEGIN
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS excerpt TEXT;
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS ribbon TEXT DEFAULT '#3546AB';
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}';
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
END $$;

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Published posts are readable by everyone
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='posts' AND policyname='Published posts are viewable by everyone') THEN
        CREATE POLICY "Published posts are viewable by everyone" ON posts FOR SELECT USING (published = true);
    END IF;
END $$;

-- Admins can see all posts (including unpublished)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='posts' AND policyname='Admins can view all posts') THEN
        CREATE POLICY "Admins can view all posts" ON posts FOR SELECT USING (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
        );
    END IF;
END $$;

-- Admins can create posts
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='posts' AND policyname='Admins can create posts') THEN
        CREATE POLICY "Admins can create posts" ON posts FOR INSERT WITH CHECK (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
        );
    END IF;
END $$;

-- Admins can update posts
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='posts' AND policyname='Admins can update posts') THEN
        CREATE POLICY "Admins can update posts" ON posts FOR UPDATE USING (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
        );
    END IF;
END $$;

-- Admins can delete posts
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='posts' AND policyname='Admins can delete posts') THEN
        CREATE POLICY "Admins can delete posts" ON posts FOR DELETE USING (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 3. COMMUNITY CHANNELS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_channels (
    id          SERIAL PRIMARY KEY,
    slug        TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE community_channels ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_channels' AND policyname='Channels are viewable by everyone') THEN
        CREATE POLICY "Channels are viewable by everyone" ON community_channels FOR SELECT USING (true);
    END IF;
END $$;

-- Seed default channels (skip if already exist)
INSERT INTO community_channels (slug, name, description) VALUES
    ('general',  'General',  'Anything goes — intros, questions, random thoughts'),
    ('feedback', 'Feedback', 'Suggestions and bug reports'),
    ('showcase', 'Showcase', 'Show off what you built'),
    ('ideas',    'Ideas',    'Feature requests and brainstorming')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 4. COMMUNITY POSTS  (forum threads & blog comments)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_posts (
    id          SERIAL PRIMARY KEY,
    channel_id  INT NOT NULL DEFAULT 1 REFERENCES community_channels(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    post_slug   TEXT,          -- links comment to a blog post slug (nullable for forum posts)
    image_url   TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist and defaults are right
DO $$ BEGIN
    ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS post_slug TEXT;
    ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS image_url TEXT;
    ALTER TABLE community_posts ALTER COLUMN channel_id SET DEFAULT 1;
END $$;

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Everyone can read
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_posts' AND policyname='Community posts are viewable by everyone') THEN
        CREATE POLICY "Community posts are viewable by everyone" ON community_posts FOR SELECT USING (true);
    END IF;
END $$;

-- Authenticated users can create
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_posts' AND policyname='Authenticated users can create community posts') THEN
        CREATE POLICY "Authenticated users can create community posts" ON community_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
    END IF;
END $$;

-- Authors can update their own posts
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_posts' AND policyname='Authors can update own community posts') THEN
        CREATE POLICY "Authors can update own community posts" ON community_posts FOR UPDATE USING (auth.uid() = author_id);
    END IF;
END $$;

-- Authors can delete their own posts
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_posts' AND policyname='Authors can delete own community posts') THEN
        CREATE POLICY "Authors can delete own community posts" ON community_posts FOR DELETE USING (auth.uid() = author_id);
    END IF;
END $$;

-- Admins can update ALL community posts
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_posts' AND policyname='Admins can update all community_posts') THEN
        CREATE POLICY "Admins can update all community_posts" ON community_posts FOR UPDATE USING (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
        );
    END IF;
END $$;

-- Admins can delete ALL community posts
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_posts' AND policyname='Admins can delete all community_posts') THEN
        CREATE POLICY "Admins can delete all community_posts" ON community_posts FOR DELETE USING (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_posts_channel   ON community_posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_author    ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_slug      ON community_posts(post_slug);
CREATE INDEX IF NOT EXISTS idx_community_posts_created   ON community_posts(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 5. COMMUNITY REPLIES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_replies (
    id          SERIAL PRIMARY KEY,
    post_id     INT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE community_replies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_replies' AND policyname='Replies are viewable by everyone') THEN
        CREATE POLICY "Replies are viewable by everyone" ON community_replies FOR SELECT USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_replies' AND policyname='Authenticated users can create replies') THEN
        CREATE POLICY "Authenticated users can create replies" ON community_replies FOR INSERT WITH CHECK (auth.uid() = author_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_replies' AND policyname='Authors can update own replies') THEN
        CREATE POLICY "Authors can update own replies" ON community_replies FOR UPDATE USING (auth.uid() = author_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_replies' AND policyname='Authors can delete own replies') THEN
        CREATE POLICY "Authors can delete own replies" ON community_replies FOR DELETE USING (auth.uid() = author_id);
    END IF;
END $$;

-- Admins can update ALL replies
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_replies' AND policyname='Admins can update all community_replies') THEN
        CREATE POLICY "Admins can update all community_replies" ON community_replies FOR UPDATE USING (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
        );
    END IF;
END $$;

-- Admins can delete ALL replies
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_replies' AND policyname='Admins can delete all community_replies') THEN
        CREATE POLICY "Admins can delete all community_replies" ON community_replies FOR DELETE USING (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_replies_post   ON community_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_community_replies_author ON community_replies(author_id);

-- ─────────────────────────────────────────────────────────────
-- 6. COMMUNITY LIKES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_likes (
    id          SERIAL PRIMARY KEY,
    post_id     INT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(post_id, user_id)
);

ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_likes' AND policyname='Likes are viewable by everyone') THEN
        CREATE POLICY "Likes are viewable by everyone" ON community_likes FOR SELECT USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_likes' AND policyname='Users can like posts') THEN
        CREATE POLICY "Users can like posts" ON community_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_likes' AND policyname='Users can unlike posts') THEN
        CREATE POLICY "Users can unlike posts" ON community_likes FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_likes_post ON community_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_user ON community_likes(user_id);

-- ─────────────────────────────────────────────────────────────
-- 7. WRITER APPLICATIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS writer_applications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    message     TEXT NOT NULL,
    source      TEXT DEFAULT 'write_for_wim',
    status      TEXT DEFAULT 'new',
    created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE writer_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an application (even unauthenticated via anon key)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='writer_applications' AND policyname='Anyone can submit writer applications') THEN
        CREATE POLICY "Anyone can submit writer applications" ON writer_applications FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Only admins can view applications
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='writer_applications' AND policyname='Admins can view writer applications') THEN
        CREATE POLICY "Admins can view writer applications" ON writer_applications FOR SELECT USING (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
        );
    END IF;
END $$;

-- Only admins can update applications
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='writer_applications' AND policyname='Admins can update writer applications') THEN
        CREATE POLICY "Admins can update writer applications" ON writer_applications FOR UPDATE USING (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
        );
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 8. USER SAVED POSTS  (bookmarks)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_saved_posts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id     UUID REFERENCES posts(id) ON DELETE CASCADE,
    post_slug   TEXT NOT NULL,
    post_title  TEXT,
    saved_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, post_slug)
);

ALTER TABLE user_saved_posts ENABLE ROW LEVEL SECURITY;

-- Users can see their own saved posts
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_saved_posts' AND policyname='Users can view own saved posts') THEN
        CREATE POLICY "Users can view own saved posts" ON user_saved_posts FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- Users can save posts
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_saved_posts' AND policyname='Users can save posts') THEN
        CREATE POLICY "Users can save posts" ON user_saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Users can unsave posts
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_saved_posts' AND policyname='Users can unsave posts') THEN
        CREATE POLICY "Users can unsave posts" ON user_saved_posts FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON user_saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_slug ON user_saved_posts(post_slug);

-- ─────────────────────────────────────────────────────────────
-- 9. REALTIME  — enable for live updates
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
    -- These may fail silently if realtime is already configured via Dashboard
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE community_posts;   EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE community_replies;  EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE community_likes;    EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 10. DATA FIX — backfill post_slug for legacy comments
-- ─────────────────────────────────────────────────────────────
UPDATE community_posts
SET post_slug = substring(title from 'comment_(.+)_\d+$')
WHERE post_slug IS NULL
  AND title ~ '^comment_.+_\d+$';

-- ============================================================
--  Done! All 8 tables are ready with full RLS.
-- ============================================================
