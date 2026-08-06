-- WIM Notebooks persistence (markdown source of truth)
-- Safe to re-run: uses IF NOT EXISTS / drop policies carefully.

-- ── notebooks ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wim_notebooks (
    -- text (not uuid): local ids include seeds like "welcome-notebook"
    id text PRIMARY KEY,
    short_id text NOT NULL,
    title text NOT NULL DEFAULT 'Untitled Notebook',
    content text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    pinned boolean NOT NULL DEFAULT false,
    is_template boolean NOT NULL DEFAULT false,
    is_published boolean NOT NULL DEFAULT false,
    publish jsonb NULL,
    version integer NOT NULL DEFAULT 1,
    -- Browser/device owner until full auth is wired (localStorage key)
    owner_key text NOT NULL,
    created_by jsonb NULL,
    last_modified_by jsonb NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS wim_notebooks_short_id_uidx
    ON public.wim_notebooks (short_id);

CREATE INDEX IF NOT EXISTS wim_notebooks_owner_key_idx
    ON public.wim_notebooks (owner_key);

CREATE INDEX IF NOT EXISTS wim_notebooks_updated_at_idx
    ON public.wim_notebooks (updated_at DESC);

CREATE INDEX IF NOT EXISTS wim_notebooks_published_idx
    ON public.wim_notebooks (is_published)
    WHERE is_published = true;

-- ── history snapshots ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wim_notebook_history (
    id bigserial PRIMARY KEY,
    notebook_id text NOT NULL REFERENCES public.wim_notebooks (id) ON DELETE CASCADE,
    version integer NOT NULL,
    content text NOT NULL,
    title text NULL,
    "timestamp" timestamptz NOT NULL DEFAULT now(),
    label text NULL
);

CREATE INDEX IF NOT EXISTS wim_notebook_history_notebook_id_idx
    ON public.wim_notebook_history (notebook_id, "timestamp" DESC);

-- ── updated_at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.wim_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wim_notebooks_set_updated_at ON public.wim_notebooks;
CREATE TRIGGER wim_notebooks_set_updated_at
    BEFORE UPDATE ON public.wim_notebooks
    FOR EACH ROW
    EXECUTE FUNCTION public.wim_set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.wim_notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wim_notebook_history ENABLE ROW LEVEL SECURITY;

-- Public can read published notebooks (share links)
DROP POLICY IF EXISTS "wim_notebooks_public_read" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_public_read"
    ON public.wim_notebooks
    FOR SELECT
    USING (is_published = true);

-- Authenticated users: full access to own rows by owner_key matching JWT claim (optional future)
-- For now API uses service role and bypasses RLS. Owner isolation is enforced in API via owner_key.

-- History: readable when parent notebook is published OR via service role
DROP POLICY IF EXISTS "wim_notebook_history_public_read" ON public.wim_notebook_history;
CREATE POLICY "wim_notebook_history_public_read"
    ON public.wim_notebook_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.wim_notebooks n
            WHERE n.id = notebook_id
              AND n.is_published = true
        )
    );

COMMENT ON TABLE public.wim_notebooks IS 'WorldInMaking markdown notebooks (local-first dual-write)';
COMMENT ON TABLE public.wim_notebook_history IS 'Version snapshots for WIM notebooks';
