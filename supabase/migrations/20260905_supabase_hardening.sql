-- WIM live-DB hardening. Idempotent. Do not re-run master_schema against prod.
-- Closes: anon TRUNCATE, token-usage RLS off, stacked insert holes,
-- notebook NULL-owner writes, world_rooms listing, storage open uploads.

-- ── 1. Missing table: durable bot queue ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wim_bot_tasks (
    id text PRIMARY KEY,
    task_type text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wim_bot_tasks_status_created_idx
    ON public.wim_bot_tasks (status, created_at);

ALTER TABLE public.wim_bot_tasks ENABLE ROW LEVEL SECURITY;

-- ── 2. Token usage + chat usage: deny clients ───────────────────────────────
ALTER TABLE public.wim_chat_token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wim_chat_usage ENABLE ROW LEVEL SECURITY;

-- ── 3. Dangerous write policies (PERMISSIVE OR) ─────────────────────────────
DROP POLICY IF EXISTS "wim_notebooks_insert" ON public.wim_notebooks;
DROP POLICY IF EXISTS "wim_notebooks_update" ON public.wim_notebooks;
DROP POLICY IF EXISTS "wim_notebooks_delete" ON public.wim_notebooks;
DROP POLICY IF EXISTS "wim_history_owner" ON public.wim_notebook_history;

DROP POLICY IF EXISTS "community_posts_insert" ON public.community_posts;
DROP POLICY IF EXISTS "community_replies_insert" ON public.community_replies;

DROP POLICY IF EXISTS "world_rooms_select_public" ON public.world_rooms;
DROP POLICY IF EXISTS "world_rooms_select_own" ON public.world_rooms;
DROP POLICY IF EXISTS "world_rooms_insert_own" ON public.world_rooms;

DROP POLICY IF EXISTS "Allow public read for forum_rss_feeds" ON public.forum_rss_feeds;
DROP POLICY IF EXISTS "Allow public read for processed_rss_items" ON public.processed_rss_items;
DROP POLICY IF EXISTS "Allow public read for agent_action_log" ON public.agent_action_log;
DROP POLICY IF EXISTS "Allow public read for agent_metadata" ON public.agent_metadata;
DROP POLICY IF EXISTS "Allow public read for agent_relationships" ON public.agent_relationships;

-- Drop any INSERT policy that does not bind the row to auth.uid()
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd = 'INSERT'
      AND tablename IN ('community_posts', 'community_replies', 'comments')
      AND (
        coalesce(with_check, '') IN (
          '(auth.uid() IS NOT NULL)',
          '(auth.role() = ''authenticated''::text)'
        )
        OR coalesce(with_check, '') LIKE '%auth.role() = ''authenticated''%'
        OR coalesce(with_check, '') = '((auth.uid() IS NOT NULL) AND (auth.uid() = author_id))'
      )
      AND policyname NOT IN (
        'community_posts_insert_own',
        'community_posts_insert_auth',
        'community_replies_insert_own',
        'com_replies_insert',
        'Authenticated users can create replies',
        'Authenticated users can create posts'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Keep a single tight insert for forum + comments
DROP POLICY IF EXISTS "community_posts_insert_own" ON public.community_posts;
CREATE POLICY "community_posts_insert_own"
    ON public.community_posts
    FOR INSERT
    WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "community_replies_insert_own" ON public.community_replies;
CREATE POLICY "community_replies_insert_own"
    ON public.community_replies
    FOR INSERT
    WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "comments_insert_own" ON public.comments;
CREATE POLICY "comments_insert_own"
    ON public.comments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Drop leftover comment inserts that only check authenticated
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'comments'
      AND cmd = 'INSERT'
      AND policyname <> 'comments_insert_own'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.comments', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "world_rooms_select_own"
    ON public.world_rooms
    FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "world_rooms_insert_own"
    ON public.world_rooms
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- ── 4. Grants: never TRUNCATE to anon/authenticated ─────────────────────────
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- Public read (RLS still filters rows)
GRANT SELECT ON TABLE
    public.profiles,
    public.posts,
    public.comments,
    public.community_channels,
    public.community_posts,
    public.community_replies,
    public.community_post_votes,
    public.community_reply_votes,
    public.community_likes,
    public.community_posts_with_stats,
    public.community_replies_with_stats,
    public.forum_mentions,
    public.post_likes,
    public.nodes,
    public.blueprint_categories,
    public.blueprint_lectures,
    public.blueprint_posts,
    public.debates,
    public.debate_turns,
    public.wim_notebooks,
    public.wim_notebook_history,
    public.wim_chats,
    public.wim_chat_messages
TO anon, authenticated;

-- Signed-in extra reads
GRANT SELECT ON TABLE
    public.user_saved_posts,
    public.post_votes,
    public.user_notifications,
    public.user_thread_subscriptions,
    public.user_worlds,
    public.world_rooms,
    public.wim_notebook_collaborators,
    public.wim_notebook_invites,
    public.wim_sync_tombstones,
    public.subscriptions
TO authenticated;

-- Signed-in writes (RLS binds to auth.uid())
GRANT INSERT, UPDATE ON TABLE public.profiles TO authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE
    public.comments,
    public.community_posts,
    public.community_replies,
    public.community_post_votes,
    public.community_reply_votes,
    public.user_saved_posts,
    public.post_likes,
    public.post_votes,
    public.user_thread_subscriptions,
    public.user_worlds,
    public.world_rooms,
    public.wim_notebooks,
    public.wim_notebook_history,
    public.nodes
TO authenticated;

GRANT INSERT ON TABLE public.forum_mentions TO authenticated;
GRANT UPDATE ON TABLE public.user_notifications TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.posts TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ── 5. Storage ──────────────────────────────────────────────────────────────
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
WHERE id IN ('blog-images', 'notebook-media', 'avatars');

DROP POLICY IF EXISTS "Allow Authenticated Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Updates" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "blog_images_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "blog_images_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "blog_images_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "notebook_media_public_read" ON storage.objects;

CREATE POLICY "notebook_media_public_read"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'notebook-media');

CREATE POLICY "avatars_insert_own"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND split_part(name, '/', 1) = auth.uid()::text
    );

CREATE POLICY "avatars_update_own"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND split_part(name, '/', 1) = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'avatars'
        AND split_part(name, '/', 1) = auth.uid()::text
    );

CREATE POLICY "avatars_delete_own"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND split_part(name, '/', 1) = auth.uid()::text
    );

CREATE POLICY "blog_images_admin_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'blog-images'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND lower(coalesce(p.role, '')) = 'admin'
        )
    );

CREATE POLICY "blog_images_admin_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'blog-images'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND lower(coalesce(p.role, '')) = 'admin'
        )
    );

CREATE POLICY "blog_images_admin_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'blog-images'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND lower(coalesce(p.role, '')) = 'admin'
        )
    );

-- ── 6. Realtime notebooks ───────────────────────────────────────────────────
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wim_notebooks;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ── 7. Profile role default + function search_path ──────────────────────────
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'member';

CREATE OR REPLACE FUNCTION public.increment_wim_chat_token_usage(
    p_subject text,
    p_day text,
    p_tokens bigint
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_new bigint;
BEGIN
    INSERT INTO public.wim_chat_token_usage (subject, day, tokens, updated_at)
    VALUES (p_subject, p_day, p_tokens, now())
    ON CONFLICT (subject, day)
    DO UPDATE SET
        tokens = public.wim_chat_token_usage.tokens + EXCLUDED.tokens,
        updated_at = now()
    RETURNING tokens INTO v_new;
    RETURN v_new;
END;
$$;

CREATE OR REPLACE FUNCTION public.restrict_author_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        ) THEN
            NEW.author_id = OLD.author_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_wim_chat_token_usage(text, text, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_wim_chat_token_usage(text, text, bigint) TO service_role;

-- ── 8. Best-effort FKs (skip if orphans) ────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wim_notebooks_auth_user_id_fkey') THEN
        ALTER TABLE public.wim_notebooks
            ADD CONSTRAINT wim_notebooks_auth_user_id_fkey
            FOREIGN KEY (auth_user_id) REFERENCES auth.users (id) ON DELETE SET NULL NOT VALID;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'skip wim_notebooks.auth_user_id fk: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wim_chats_auth_user_id_fkey') THEN
        ALTER TABLE public.wim_chats
            ADD CONSTRAINT wim_chats_auth_user_id_fkey
            FOREIGN KEY (auth_user_id) REFERENCES auth.users (id) ON DELETE SET NULL NOT VALID;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'skip wim_chats.auth_user_id fk: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_worlds_user_id_fkey') THEN
        ALTER TABLE public.user_worlds
            ADD CONSTRAINT user_worlds_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE NOT VALID;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'skip user_worlds.user_id fk: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'world_rooms_owner_id_fkey') THEN
        ALTER TABLE public.world_rooms
            ADD CONSTRAINT world_rooms_owner_id_fkey
            FOREIGN KEY (owner_id) REFERENCES auth.users (id) ON DELETE SET NULL NOT VALID;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'skip world_rooms.owner_id fk: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_fkey') THEN
        ALTER TABLE public.subscriptions
            ADD CONSTRAINT subscriptions_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE NOT VALID;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'skip subscriptions.user_id fk: %', SQLERRM;
END $$;

NOTIFY pgrst, 'reload schema';
