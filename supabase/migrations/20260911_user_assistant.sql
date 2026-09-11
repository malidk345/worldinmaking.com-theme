-- Personal assistant state (philosopher, notices, answers, cadence).
-- Safe to re-run. Client keeps localStorage as the offline cache.

CREATE TABLE IF NOT EXISTS public.user_assistant (
    user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    philosopher_id text,
    notices jsonb NOT NULL DEFAULT '[]'::jsonb,
    answers jsonb NOT NULL DEFAULT '[]'::jsonb,
    memory jsonb NOT NULL DEFAULT '[]'::jsonb,
    cadence jsonb NOT NULL DEFAULT '{}'::jsonb,
    watch_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_assistant ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_assistant_select_own" ON public.user_assistant;
CREATE POLICY "user_assistant_select_own"
    ON public.user_assistant FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_assistant_insert_own" ON public.user_assistant;
CREATE POLICY "user_assistant_insert_own"
    ON public.user_assistant FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_assistant_update_own" ON public.user_assistant;
CREATE POLICY "user_assistant_update_own"
    ON public.user_assistant FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.user_assistant TO authenticated;
