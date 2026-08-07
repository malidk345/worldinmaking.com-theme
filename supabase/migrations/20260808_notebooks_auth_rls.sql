-- WIM Notebooks: Auth user ID column + RLS policies for Supabase-authed users.
-- Safe to re-run. Run after 20260806_wim_notebooks.sql.

-- ── Add auth_user_id column (nullable — anonymous users stay owner_key only) ──
ALTER TABLE public.wim_notebooks
    ADD COLUMN IF NOT EXISTS auth_user_id uuid NULL
        REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS wim_notebooks_auth_user_id_idx
    ON public.wim_notebooks (auth_user_id)
    WHERE auth_user_id IS NOT NULL;

-- ── RLS: authenticated users access their own notebooks by auth_user_id ────────
-- (Previous device-key policy remains for anonymous / unauthenticated users)

-- Authenticated SELECT: own notebooks via auth.uid()
DROP POLICY IF EXISTS "wim_notebooks_auth_select" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_auth_select"
    ON public.wim_notebooks
    FOR SELECT
    USING (
        auth_user_id = auth.uid()
        OR is_published = true
    );

-- Authenticated INSERT
DROP POLICY IF EXISTS "wim_notebooks_auth_insert" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_auth_insert"
    ON public.wim_notebooks
    FOR INSERT
    WITH CHECK (
        auth_user_id = auth.uid()
    );

-- Authenticated UPDATE (own rows only)
DROP POLICY IF EXISTS "wim_notebooks_auth_update" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_auth_update"
    ON public.wim_notebooks
    FOR UPDATE
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Authenticated DELETE (own rows only)
DROP POLICY IF EXISTS "wim_notebooks_auth_delete" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_auth_delete"
    ON public.wim_notebooks
    FOR DELETE
    USING (auth_user_id = auth.uid());

-- ── History RLS: authenticated users can read/write their own notebook history ─
DROP POLICY IF EXISTS "wim_notebook_history_auth_select" ON public.wim_notebook_history;
CREATE POLICY "wim_notebook_history_auth_select"
    ON public.wim_notebook_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.wim_notebooks n
            WHERE n.id = notebook_id
              AND (n.auth_user_id = auth.uid() OR n.is_published = true)
        )
    );

DROP POLICY IF EXISTS "wim_notebook_history_auth_insert" ON public.wim_notebook_history;
CREATE POLICY "wim_notebook_history_auth_insert"
    ON public.wim_notebook_history
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.wim_notebooks n
            WHERE n.id = notebook_id
              AND n.auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "wim_notebook_history_auth_delete" ON public.wim_notebook_history;
CREATE POLICY "wim_notebook_history_auth_delete"
    ON public.wim_notebook_history
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.wim_notebooks n
            WHERE n.id = notebook_id
              AND n.auth_user_id = auth.uid()
        )
    );

COMMENT ON COLUMN public.wim_notebooks.auth_user_id IS
    'Supabase auth.users.id — set when the notebook is created/synced by an authenticated user. NULL for anonymous device-key notebooks.';
