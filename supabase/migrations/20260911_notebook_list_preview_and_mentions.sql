-- Slim notebook list (preview column) + in-app mention/comment notifications.
-- Safe to re-run. PostgreSQL 14+.

ALTER TABLE public.wim_notebooks
    ADD COLUMN IF NOT EXISTS preview text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.wim_notebook_excerpt(src text, max_len integer DEFAULT 200)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT left(
        trim(both from regexp_replace(
            regexp_replace(coalesce(src, ''), '<[^>]+>', ' ', 'g'),
            '\s+', ' ', 'g'
        )),
        GREATEST(20, LEAST(coalesce(max_len, 200), 400))
    );
$$;

CREATE OR REPLACE FUNCTION public.wim_notebooks_set_preview()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.preview := public.wim_notebook_excerpt(NEW.content, 200);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wim_notebooks_set_preview_trg ON public.wim_notebooks;
CREATE TRIGGER wim_notebooks_set_preview_trg
    BEFORE INSERT OR UPDATE OF content
    ON public.wim_notebooks
    FOR EACH ROW
    EXECUTE FUNCTION public.wim_notebooks_set_preview();

UPDATE public.wim_notebooks
SET preview = public.wim_notebook_excerpt(content, 200)
WHERE preview = '' AND coalesce(content, '') <> '';

CREATE TABLE IF NOT EXISTS public.wim_notebook_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    notebook_id text NOT NULL REFERENCES public.wim_notebooks (id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('mention', 'comment')),
    actor_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
    excerpt text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    dismissed_at timestamptz NULL
);

-- One unread row per (recipient, notebook, kind, actor).
CREATE UNIQUE INDEX IF NOT EXISTS wim_notebook_notifications_open_kind_uidx
    ON public.wim_notebook_notifications (user_id, notebook_id, kind, actor_id)
    WHERE dismissed_at IS NULL;

CREATE INDEX IF NOT EXISTS wim_notebook_notifications_user_unread_idx
    ON public.wim_notebook_notifications (user_id, created_at DESC)
    WHERE dismissed_at IS NULL;

ALTER TABLE public.wim_notebook_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wim_notebook_notifications_select" ON public.wim_notebook_notifications;
CREATE POLICY "wim_notebook_notifications_select"
    ON public.wim_notebook_notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wim_notebook_notifications_update" ON public.wim_notebook_notifications;
CREATE POLICY "wim_notebook_notifications_update"
    ON public.wim_notebook_notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

GRANT SELECT, UPDATE ON TABLE public.wim_notebook_notifications TO authenticated;
GRANT ALL ON TABLE public.wim_notebook_notifications TO service_role;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wim_notebook_notifications;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END
$$;

NOTIFY pgrst, 'reload schema';
