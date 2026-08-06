-- RLS for user-owned social tables (bookmarks, likes, votes)

-- user_saved_posts
ALTER TABLE public.user_saved_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_saved_posts_select_own" ON public.user_saved_posts;
CREATE POLICY "user_saved_posts_select_own" ON public.user_saved_posts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_saved_posts_insert_own" ON public.user_saved_posts;
CREATE POLICY "user_saved_posts_insert_own" ON public.user_saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_saved_posts_update_own" ON public.user_saved_posts;
CREATE POLICY "user_saved_posts_update_own" ON public.user_saved_posts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_saved_posts_delete_own" ON public.user_saved_posts;
CREATE POLICY "user_saved_posts_delete_own" ON public.user_saved_posts FOR DELETE USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS user_saved_posts_user_post_uidx
  ON public.user_saved_posts (user_id, post_id);

-- post_likes
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "post_likes_select_own" ON public.post_likes;
CREATE POLICY "post_likes_select_own" ON public.post_likes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "post_likes_public_read" ON public.post_likes;
CREATE POLICY "post_likes_public_read" ON public.post_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "post_likes_insert_own" ON public.post_likes;
CREATE POLICY "post_likes_insert_own" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "post_likes_delete_own" ON public.post_likes;
CREATE POLICY "post_likes_delete_own" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS post_likes_user_post_uidx
  ON public.post_likes (user_id, post_id);

-- community_post_votes
ALTER TABLE public.community_post_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cpv_select" ON public.community_post_votes;
CREATE POLICY "cpv_select" ON public.community_post_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "cpv_insert_own" ON public.community_post_votes;
CREATE POLICY "cpv_insert_own" ON public.community_post_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "cpv_update_own" ON public.community_post_votes;
CREATE POLICY "cpv_update_own" ON public.community_post_votes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "cpv_delete_own" ON public.community_post_votes;
CREATE POLICY "cpv_delete_own" ON public.community_post_votes FOR DELETE USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS community_post_votes_user_post_uidx
  ON public.community_post_votes (user_id, post_id);

-- community_reply_votes
ALTER TABLE public.community_reply_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crv_select" ON public.community_reply_votes;
CREATE POLICY "crv_select" ON public.community_reply_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "crv_insert_own" ON public.community_reply_votes;
CREATE POLICY "crv_insert_own" ON public.community_reply_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "crv_update_own" ON public.community_reply_votes;
CREATE POLICY "crv_update_own" ON public.community_reply_votes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "crv_delete_own" ON public.community_reply_votes;
CREATE POLICY "crv_delete_own" ON public.community_reply_votes FOR DELETE USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS community_reply_votes_user_reply_uidx
  ON public.community_reply_votes (user_id, reply_id);

NOTIFY pgrst, 'reload schema';
