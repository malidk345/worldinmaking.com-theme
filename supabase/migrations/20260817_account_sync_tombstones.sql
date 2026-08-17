-- Soft-delete + account claim for chats and notebooks.
-- Safe to re-run.

ALTER TABLE public.wim_chats
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

ALTER TABLE public.wim_notebooks
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS wim_chats_owner_active_idx
    ON public.wim_chats (owner_key, updated_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS wim_chats_auth_active_idx
    ON public.wim_chats (auth_user_id, updated_at DESC)
    WHERE deleted_at IS NULL AND auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS wim_notebooks_owner_active_idx
    ON public.wim_notebooks (owner_key, updated_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS wim_notebooks_auth_active_idx
    ON public.wim_notebooks (auth_user_id, updated_at DESC)
    WHERE deleted_at IS NULL AND auth_user_id IS NOT NULL;

COMMENT ON COLUMN public.wim_chats.deleted_at IS 'Soft delete so other devices drop the chat instead of resurrecting it';
COMMENT ON COLUMN public.wim_notebooks.deleted_at IS 'Soft delete so other devices drop the notebook instead of resurrecting it';
