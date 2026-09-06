-- Folders, tags, daily notes, and kind live on wim_notebooks.organize jsonb.
-- Safe to re-run.

ALTER TABLE public.wim_notebooks
    ADD COLUMN IF NOT EXISTS organize jsonb;

COMMENT ON COLUMN public.wim_notebooks.organize IS
    'Notebook organization: { folder, tags, kind, dailyDate }. Client maps these onto StoredNotebook.';
