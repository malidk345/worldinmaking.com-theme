-- =============================================================
-- SYSTEM REFINEMENT V2 (Minor Adjustments & Compatibility)
-- =============================================================

-- 1. RELATION COMPATIBILITY & VOTE RANGE ADJUSTMENT
-- Frontend (ArticleActions.tsx) allows up to +5/-5 for blog posts.
-- We must drop the old constraint and add the new range.
ALTER TABLE public.post_votes DROP CONSTRAINT IF EXISTS post_votes_vote_check;
ALTER TABLE public.post_votes ADD CONSTRAINT post_votes_vote_check CHECK (vote >= -5 AND vote <= 5);

-- Frontend specifically looks for 'community_likes', we point it to votes
DROP VIEW IF EXISTS community_likes CASCADE;
CREATE OR REPLACE VIEW community_likes WITH (security_invoker = true) AS
SELECT post_id as id, count(*) as count
FROM community_post_votes
WHERE vote > 0
GROUP BY post_id;

-- 2. PERFORMANCE INDEXES (Missing in initial run)
CREATE INDEX IF NOT EXISTS idx_nodes_status ON public.nodes(status);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (lower(username));

-- 3. EXTRA FIELDS FOR APPLICATIONS (Admin context)
DO $$ BEGIN
    ALTER TABLE public.writer_applications ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
    ALTER TABLE public.writer_applications ADD COLUMN IF NOT EXISTS social_handle TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. CLEANUP DANGEROUS PERMISSIONS
DO $$ BEGIN
    -- Ensure no one can update profiles of others
    DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
    CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 5. STORAGE BUCKETS INITIALIZATION (Ensuring they are truly usable)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true), ('posts', 'posts', true), ('nodes', 'nodes', false)
ON CONFLICT (id) DO NOTHING;
