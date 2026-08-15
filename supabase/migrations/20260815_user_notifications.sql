-- In-app forum notifications + thread subscriptions.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.user_thread_subscriptions (
    user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    post_id bigint NOT NULL REFERENCES public.community_posts (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS user_thread_subscriptions_post_id_idx
    ON public.user_thread_subscriptions (post_id);

CREATE TABLE IF NOT EXISTS public.user_notifications (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    post_id bigint NOT NULL REFERENCES public.community_posts (id) ON DELETE CASCADE,
    title text NOT NULL DEFAULT 'Forum thread',
    excerpt text NOT NULL DEFAULT 'New reply',
    reply_count integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    dismissed_at timestamptz NULL,
    UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS user_notifications_user_unread_idx
    ON public.user_notifications (user_id, created_at DESC)
    WHERE dismissed_at IS NULL;

ALTER TABLE public.user_thread_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_thread_subscriptions_select" ON public.user_thread_subscriptions;
CREATE POLICY "user_thread_subscriptions_select"
    ON public.user_thread_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_thread_subscriptions_insert" ON public.user_thread_subscriptions;
CREATE POLICY "user_thread_subscriptions_insert"
    ON public.user_thread_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_thread_subscriptions_delete" ON public.user_thread_subscriptions;
CREATE POLICY "user_thread_subscriptions_delete"
    ON public.user_thread_subscriptions FOR DELETE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_notifications_select" ON public.user_notifications;
CREATE POLICY "user_notifications_select"
    ON public.user_notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_notifications_update" ON public.user_notifications;
CREATE POLICY "user_notifications_update"
    ON public.user_notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.wim_subscribe_post_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.author_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = NEW.author_id AND COALESCE(p.is_bot, false) = false
    ) THEN
        INSERT INTO public.user_thread_subscriptions (user_id, post_id)
        VALUES (NEW.author_id, NEW.id)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wim_subscribe_post_author_trg ON public.community_posts;
CREATE TRIGGER wim_subscribe_post_author_trg
    AFTER INSERT ON public.community_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.wim_subscribe_post_author();

CREATE OR REPLACE FUNCTION public.wim_notify_thread_subscribers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    post_title text;
BEGIN
    IF NEW.author_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = NEW.author_id AND COALESCE(p.is_bot, false) = false
    ) THEN
        INSERT INTO public.user_thread_subscriptions (user_id, post_id)
        VALUES (NEW.author_id, NEW.post_id)
        ON CONFLICT DO NOTHING;
    END IF;

    SELECT title INTO post_title FROM public.community_posts WHERE id = NEW.post_id;

    INSERT INTO public.user_notifications (user_id, post_id, title, excerpt, reply_count, created_at, dismissed_at)
    SELECT
        s.user_id,
        NEW.post_id,
        COALESCE(NULLIF(post_title, ''), 'Forum thread'),
        'New reply',
        1,
        now(),
        NULL
    FROM public.user_thread_subscriptions s
    WHERE s.post_id = NEW.post_id
      AND (NEW.author_id IS NULL OR s.user_id <> NEW.author_id)
    ON CONFLICT (user_id, post_id) DO UPDATE SET
        reply_count = CASE
            WHEN public.user_notifications.dismissed_at IS NULL THEN public.user_notifications.reply_count + 1
            ELSE 1
        END,
        dismissed_at = NULL,
        created_at = now(),
        title = EXCLUDED.title,
        excerpt = EXCLUDED.excerpt;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wim_notify_thread_subscribers_trg ON public.community_replies;
CREATE TRIGGER wim_notify_thread_subscribers_trg
    AFTER INSERT ON public.community_replies
    FOR EACH ROW
    EXECUTE FUNCTION public.wim_notify_thread_subscribers();

GRANT SELECT, INSERT, DELETE ON public.user_thread_subscriptions TO authenticated;
GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_notifications_id_seq TO authenticated;
