-- Forum staff actions used by the thread toolbar.
-- Safe to re-run.

ALTER TABLE public.community_posts
    ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

ALTER TABLE public.community_posts
    ADD COLUMN IF NOT EXISTS resolved_reply_id bigint NULL;

CREATE INDEX IF NOT EXISTS community_posts_is_archived_idx
    ON public.community_posts (is_archived)
    WHERE is_archived = true;

CREATE INDEX IF NOT EXISTS community_posts_resolved_reply_id_idx
    ON public.community_posts (resolved_reply_id)
    WHERE resolved_reply_id IS NOT NULL;

ALTER TABLE public.community_replies
    ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
