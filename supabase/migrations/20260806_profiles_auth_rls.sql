-- Ensure authenticated users can read/update their own profile (WIM auth).
-- Public read already exists in many installs; policies are idempotent.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
CREATE POLICY "profiles_public_read"
    ON public.profiles
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Notebooks: owner can manage by owner_key matching auth.uid()::text OR legacy device keys via service role API only.
-- Keep public read of published; owner CRUD when JWT present.
DROP POLICY IF EXISTS "wim_notebooks_owner_select" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_owner_select"
    ON public.wim_notebooks
    FOR SELECT
    USING (is_published = true OR owner_key = auth.uid()::text);

DROP POLICY IF EXISTS "wim_notebooks_owner_insert" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_owner_insert"
    ON public.wim_notebooks
    FOR INSERT
    WITH CHECK (owner_key = auth.uid()::text);

DROP POLICY IF EXISTS "wim_notebooks_owner_update" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_owner_update"
    ON public.wim_notebooks
    FOR UPDATE
    USING (owner_key = auth.uid()::text)
    WITH CHECK (owner_key = auth.uid()::text);

DROP POLICY IF EXISTS "wim_notebooks_owner_delete" ON public.wim_notebooks;
CREATE POLICY "wim_notebooks_owner_delete"
    ON public.wim_notebooks
    FOR DELETE
    USING (owner_key = auth.uid()::text);

NOTIFY pgrst, 'reload schema';
