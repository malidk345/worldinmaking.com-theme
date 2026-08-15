-- Admin moderation columns that the dashboard already assumed.
-- Safe to re-run.

ALTER TABLE public.community_posts
    ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS community_posts_is_pinned_idx
    ON public.community_posts (is_pinned)
    WHERE is_pinned = true;

ALTER TABLE public.contact_messages
    ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;
