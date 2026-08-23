-- Lightweight delete ledger. Chat/notebook rows are hard-deleted;
-- other devices learn the id from here instead of resurrecting content.

CREATE TABLE IF NOT EXISTS public.wim_sync_tombstones (
    kind text NOT NULL CHECK (kind IN ('chat', 'notebook')),
    item_id text NOT NULL,
    owner_key text NOT NULL,
    auth_user_id uuid NULL,
    deleted_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (kind, item_id)
);

CREATE INDEX IF NOT EXISTS wim_sync_tombstones_owner_idx
    ON public.wim_sync_tombstones (owner_key, kind, deleted_at DESC);

CREATE INDEX IF NOT EXISTS wim_sync_tombstones_auth_idx
    ON public.wim_sync_tombstones (auth_user_id, kind)
    WHERE auth_user_id IS NOT NULL;

ALTER TABLE public.wim_sync_tombstones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wim_sync_tombstones_owner_read ON public.wim_sync_tombstones;
CREATE POLICY wim_sync_tombstones_owner_read
    ON public.wim_sync_tombstones
    FOR SELECT
    USING (
        owner_key = coalesce(auth.uid()::text, '')
        OR auth_user_id = auth.uid()
    );

COMMENT ON TABLE public.wim_sync_tombstones IS
    'Ids of hard-deleted chats/notebooks so other devices drop them without keeping the content.';
