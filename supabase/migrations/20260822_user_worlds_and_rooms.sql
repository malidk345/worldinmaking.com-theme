-- Account-backed world (wallpaper, windows, desktop pins) + unlisted shareable rooms.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.user_worlds (
    user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_worlds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_worlds_select_own" ON public.user_worlds;
CREATE POLICY "user_worlds_select_own"
    ON public.user_worlds FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_worlds_upsert_own" ON public.user_worlds;
DROP POLICY IF EXISTS "user_worlds_insert_own" ON public.user_worlds;
CREATE POLICY "user_worlds_insert_own"
    ON public.user_worlds FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_worlds_update_own" ON public.user_worlds;
CREATE POLICY "user_worlds_update_own"
    ON public.user_worlds FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.world_rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token text NOT NULL UNIQUE,
    owner_id uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
    title text NOT NULL DEFAULT 'Shared room',
    snapshot jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT world_rooms_token_len CHECK (char_length(token) >= 8 AND char_length(token) <= 40)
);

CREATE INDEX IF NOT EXISTS world_rooms_owner_idx ON public.world_rooms (owner_id, created_at DESC);

ALTER TABLE public.world_rooms ENABLE ROW LEVEL SECURITY;

-- Unlisted: anyone with the token can read the snapshot.
DROP POLICY IF EXISTS "world_rooms_select_public" ON public.world_rooms;
CREATE POLICY "world_rooms_select_public"
    ON public.world_rooms FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "world_rooms_insert_own" ON public.world_rooms;
CREATE POLICY "world_rooms_insert_own"
    ON public.world_rooms FOR INSERT
    WITH CHECK (owner_id IS NULL OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "world_rooms_update_own" ON public.world_rooms;
CREATE POLICY "world_rooms_update_own"
    ON public.world_rooms FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "world_rooms_delete_own" ON public.world_rooms;
CREATE POLICY "world_rooms_delete_own"
    ON public.world_rooms FOR DELETE
    USING (auth.uid() = owner_id);

GRANT SELECT, INSERT, UPDATE ON public.user_worlds TO authenticated;
GRANT ALL ON public.user_worlds TO service_role;
GRANT SELECT ON public.world_rooms TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.world_rooms TO authenticated;
GRANT ALL ON public.world_rooms TO service_role;

COMMENT ON TABLE public.user_worlds IS 'Signed-in desktop world: wallpaper, chrome, open windows, pins';
COMMENT ON TABLE public.world_rooms IS 'Unlisted shareable world snapshots (/room/:token)';
