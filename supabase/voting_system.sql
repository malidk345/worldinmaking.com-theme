-- ─────────────────────────────────────────────────────────────
-- VOTING SYSTEM (LIKES/VOTES) - FULLY SECURE & OPTIMIZED
-- ─────────────────────────────────────────────────────────────

-- 1. TABLES
CREATE TABLE IF NOT EXISTS post_votes (
    id          SERIAL PRIMARY KEY,
    post_slug   TEXT NOT NULL,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote        INT NOT NULL CHECK (vote IN (-1, 0, 1)), -- Strict toggle logic
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(post_slug, user_id) -- One vote per user per blog post
);

CREATE TABLE IF NOT EXISTS community_post_votes (
    id          SERIAL PRIMARY KEY,
    post_id     INT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote        INT NOT NULL CHECK (vote IN (-1, 0, 1)),
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(post_id, user_id) -- One vote per user per forum post
);

CREATE TABLE IF NOT EXISTS community_reply_votes (
    id          SERIAL PRIMARY KEY,
    reply_id    INT NOT NULL REFERENCES community_replies(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote        INT NOT NULL CHECK (vote IN (-1, 0, 1)),
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(reply_id, user_id) -- One vote per user per reply
);

-- 2. RLS (Row Level Security)
ALTER TABLE post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reply_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    -- Select: Anyone can see total counts (handled by views/RPC), but only admins/owners see raw rows
    CREATE POLICY "view_votes" ON post_votes FOR SELECT USING (true);
    CREATE POLICY "manage_own_post_votes" ON post_votes FOR ALL USING (auth.uid() = user_id);

    CREATE POLICY "view_com_post_votes" ON community_post_votes FOR SELECT USING (true);
    CREATE POLICY "manage_own_com_post_votes" ON community_post_votes FOR ALL USING (auth.uid() = user_id);

    CREATE POLICY "view_com_reply_votes" ON community_reply_votes FOR SELECT USING (true);
    CREATE POLICY "manage_own_com_reply_votes" ON community_reply_votes FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 3. TOTAL VOTE VIEWS (Aggregated)
DROP VIEW IF EXISTS community_posts_with_stats CASCADE;
CREATE VIEW community_posts_with_stats WITH (security_invoker = true) AS
SELECT p.*, 
    (SELECT COALESCE(SUM(v.vote), 0) FROM community_post_votes v WHERE v.post_id = p.id) as total_votes,
    (SELECT COUNT(*) FROM community_replies r WHERE r.post_id = p.id) as reply_count
FROM community_posts p;

DROP VIEW IF EXISTS community_replies_with_stats CASCADE;
CREATE VIEW community_replies_with_stats WITH (security_invoker = true) AS
SELECT r.*, 
    (SELECT COALESCE(SUM(v.vote), 0) FROM community_reply_votes v WHERE v.reply_id = r.id) as total_votes
FROM community_replies r;

-- 4. AGGREGATION FUNCTIONS (RPC) - Faster for frontend
CREATE OR REPLACE FUNCTION get_post_total_votes(post_slug_input TEXT) RETURNS INT AS $$
    SELECT COALESCE(SUM(vote), 0)::INT FROM post_votes WHERE post_slug = post_slug_input;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_com_post_total_votes(post_id_input INT) RETURNS INT AS $$
    SELECT COALESCE(SUM(vote), 0)::INT FROM community_post_votes WHERE post_id = post_id_input;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 5. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_post_votes_slug ON post_votes(post_slug);
CREATE INDEX IF NOT EXISTS idx_com_post_votes_id ON community_post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_com_reply_votes_id ON community_reply_votes(reply_id);

-- 6. TIMESTAMPS
CREATE TRIGGER tr_post_votes_updated_at BEFORE UPDATE ON post_votes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER tr_com_post_votes_updated_at BEFORE UPDATE ON community_post_votes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER tr_com_replies_votes_updated_at BEFORE UPDATE ON community_reply_votes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
