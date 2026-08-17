-- Authenticated users can SELECT their own notebooks so Realtime works.
-- Writes still go through the service-role API.

DROP POLICY IF EXISTS "wim_notebooks_account_select" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_account_select"
    ON public.wim_notebooks
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND auth.uid() IS NOT NULL
        AND (
            auth_user_id = auth.uid()
            OR owner_key = auth.uid()::text
            OR is_published = true
        )
    );

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wim_notebooks;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
