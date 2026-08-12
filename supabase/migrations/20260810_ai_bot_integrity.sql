-- AI bot support tables used by the autonomous RSS curator.
-- Service-role workers are the only writers; keep these tables out of the public API.

CREATE TABLE IF NOT EXISTS public.forum_rss_feeds (
    id bigserial PRIMARY KEY,
    feed_url text NOT NULL UNIQUE,
    category text NOT NULL DEFAULT 'general',
    default_author text NOT NULL DEFAULT 'marx',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.processed_rss_items (
    id bigserial PRIMARY KEY,
    feed_id bigint NOT NULL REFERENCES public.forum_rss_feeds (id) ON DELETE CASCADE,
    guid text NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (feed_id, guid)
);

CREATE INDEX IF NOT EXISTS processed_rss_items_guid_idx
    ON public.processed_rss_items (guid);
