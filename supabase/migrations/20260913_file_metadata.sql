-- ==============================================================================
-- Migration: 20260913_file_metadata.sql
-- Description: Cloudflare R2 object storage metadata and profiles avatar_key column.
-- ==============================================================================

-- 1. Profiles: add avatar_key column if not present
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS avatar_key TEXT;

GRANT SELECT (avatar_key), UPDATE (avatar_key) ON public.profiles TO authenticated;
GRANT SELECT (avatar_key) ON public.profiles TO anon;

-- 2. File Metadata Table
CREATE TABLE IF NOT EXISTS public.file_metadata (
    file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notebook_id TEXT REFERENCES public.wim_notebooks(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size BIGINT NOT NULL,
    storage_key TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('avatar', 'notebook', 'attachment', 'chat', 'generated', 'upload')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_file_metadata_owner_id ON public.file_metadata(owner_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_notebook_id ON public.file_metadata(notebook_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_storage_key ON public.file_metadata(storage_key);

-- 4. Row Level Security (RLS)
ALTER TABLE public.file_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "file_metadata_select_own" ON public.file_metadata;
CREATE POLICY "file_metadata_select_own"
    ON public.file_metadata
    FOR SELECT
    USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "file_metadata_insert_own" ON public.file_metadata;
CREATE POLICY "file_metadata_insert_own"
    ON public.file_metadata
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "file_metadata_update_own" ON public.file_metadata;
CREATE POLICY "file_metadata_update_own"
    ON public.file_metadata
    FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "file_metadata_delete_own" ON public.file_metadata;
CREATE POLICY "file_metadata_delete_own"
    ON public.file_metadata
    FOR DELETE
    USING (auth.uid() = owner_id);

-- 5. Grants
GRANT ALL ON public.file_metadata TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_metadata TO authenticated;
