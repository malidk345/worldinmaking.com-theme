-- Real forum @mentions. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.forum_mentions (
    id bigserial PRIMARY KEY,
    post_id bigint NOT NULL REFERENCES public.community_posts (id) ON DELETE CASCADE,
    reply_id bigint NULL REFERENCES public.community_replies (id) ON DELETE CASCADE,
    mentioned_user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    mentioned_username text NOT NULL,
    author_id uuid NULL REFERENCES public.profiles (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS forum_mentions_reply_user_uidx
    ON public.forum_mentions (reply_id, mentioned_user_id)
    WHERE reply_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS forum_mentions_mentioned_user_idx
    ON public.forum_mentions (mentioned_user_id, created_at DESC);

ALTER TABLE public.forum_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forum_mentions_select" ON public.forum_mentions;
CREATE POLICY "forum_mentions_select"
    ON public.forum_mentions FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "forum_mentions_insert" ON public.forum_mentions;
CREATE POLICY "forum_mentions_insert"
    ON public.forum_mentions FOR INSERT
    WITH CHECK (auth.uid() = author_id);

GRANT SELECT, INSERT ON public.forum_mentions TO authenticated;
GRANT SELECT ON public.forum_mentions TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.forum_mentions_id_seq TO authenticated;

CREATE OR REPLACE FUNCTION public.wim_notify_forum_mention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    post_title text;
BEGIN
    IF NEW.mentioned_user_id IS NULL OR NEW.mentioned_user_id = NEW.author_id THEN
        RETURN NEW;
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = NEW.mentioned_user_id AND COALESCE(p.is_bot, false) = true
    ) THEN
        RETURN NEW;
    END IF;

    SELECT title INTO post_title FROM public.community_posts WHERE id = NEW.post_id;

    INSERT INTO public.user_notifications (user_id, post_id, title, excerpt, reply_count, created_at, dismissed_at)
    VALUES (
        NEW.mentioned_user_id,
        NEW.post_id,
        COALESCE(NULLIF(post_title, ''), 'Forum thread'),
        'Mentioned you',
        1,
        now(),
        NULL
    )
    ON CONFLICT (user_id, post_id) DO UPDATE SET
        excerpt = 'Mentioned you',
        dismissed_at = NULL,
        created_at = now(),
        title = EXCLUDED.title;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wim_notify_forum_mention_trg ON public.forum_mentions;
CREATE TRIGGER wim_notify_forum_mention_trg
    AFTER INSERT ON public.forum_mentions
    FOR EACH ROW
    EXECUTE FUNCTION public.wim_notify_forum_mention();
