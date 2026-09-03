-- Multi-user notebook writing: collaborators + invite tokens.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.wim_notebook_collaborators (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id text NOT NULL REFERENCES public.wim_notebooks (id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'editor',
    invited_by uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT wim_notebook_collaborators_role_chk CHECK (role IN ('editor', 'viewer')),
    CONSTRAINT wim_notebook_collaborators_unique UNIQUE (notebook_id, user_id)
);

CREATE INDEX IF NOT EXISTS wim_notebook_collaborators_user_idx
    ON public.wim_notebook_collaborators (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS wim_notebook_collaborators_notebook_idx
    ON public.wim_notebook_collaborators (notebook_id);

CREATE TABLE IF NOT EXISTS public.wim_notebook_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id text NOT NULL REFERENCES public.wim_notebooks (id) ON DELETE CASCADE,
    token text NOT NULL UNIQUE,
    email text NULL,
    username text NULL,
    invited_user_id uuid NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'editor',
    invited_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
    accepted_at timestamptz NULL,
    accepted_by uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
    revoked_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT wim_notebook_invites_role_chk CHECK (role IN ('editor', 'viewer')),
    CONSTRAINT wim_notebook_invites_token_len CHECK (char_length(token) >= 16 AND char_length(token) <= 80)
);

CREATE INDEX IF NOT EXISTS wim_notebook_invites_notebook_idx
    ON public.wim_notebook_invites (notebook_id, created_at DESC);

CREATE INDEX IF NOT EXISTS wim_notebook_invites_token_idx
    ON public.wim_notebook_invites (token);

CREATE INDEX IF NOT EXISTS wim_notebook_invites_invitee_idx
    ON public.wim_notebook_invites (invited_user_id)
    WHERE invited_user_id IS NOT NULL AND accepted_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.wim_notebook_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wim_notebook_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.wim_is_notebook_collaborator(nb_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.wim_notebook_collaborators c
        WHERE c.notebook_id = nb_id
          AND c.user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.wim_owns_notebook(nb_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.wim_notebooks n
        WHERE n.id = nb_id
          AND n.deleted_at IS NULL
          AND auth.uid() IS NOT NULL
          AND (n.auth_user_id = auth.uid() OR n.owner_key = auth.uid()::text)
    );
$$;

REVOKE ALL ON FUNCTION public.wim_is_notebook_collaborator(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wim_owns_notebook(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wim_is_notebook_collaborator(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wim_owns_notebook(text) TO anon, authenticated;

DROP POLICY IF EXISTS "wim_notebooks_collaborator_select" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_collaborator_select"
    ON public.wim_notebooks
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND auth.uid() IS NOT NULL
        AND public.wim_is_notebook_collaborator(id)
    );

DROP POLICY IF EXISTS "wim_notebook_history_collaborator_select" ON public.wim_notebook_history;
CREATE POLICY "wim_notebook_history_collaborator_select"
    ON public.wim_notebook_history
    FOR SELECT
    USING (public.wim_is_notebook_collaborator(notebook_id) OR public.wim_owns_notebook(notebook_id));

DROP POLICY IF EXISTS "wim_notebook_collaborators_select" ON public.wim_notebook_collaborators;
CREATE POLICY "wim_notebook_collaborators_select"
    ON public.wim_notebook_collaborators
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR public.wim_owns_notebook(notebook_id)
        OR public.wim_is_notebook_collaborator(notebook_id)
    );

DROP POLICY IF EXISTS "wim_notebook_invites_select" ON public.wim_notebook_invites;
CREATE POLICY "wim_notebook_invites_select"
    ON public.wim_notebook_invites
    FOR SELECT
    USING (
        auth.uid() = invited_by
        OR auth.uid() = invited_user_id
        OR public.wim_owns_notebook(notebook_id)
    );

GRANT SELECT ON public.wim_notebook_collaborators TO authenticated;
GRANT SELECT ON public.wim_notebook_invites TO authenticated;
GRANT ALL ON public.wim_notebook_collaborators TO service_role;
GRANT ALL ON public.wim_notebook_invites TO service_role;

COMMENT ON TABLE public.wim_notebook_collaborators IS 'People who can read or write a notebook besides the owner';
COMMENT ON TABLE public.wim_notebook_invites IS 'Pending notebook invite links (email, username, or anyone-with-link)';

NOTIFY pgrst, 'reload schema';
