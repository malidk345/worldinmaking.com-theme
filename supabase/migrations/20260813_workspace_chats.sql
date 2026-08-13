-- Workspace chat persistence (Faz B / TSK-51)
-- Safe to re-run: IF NOT EXISTS / drop-create policies.

-- ── chats ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wim_chats (
    id text PRIMARY KEY,
    owner_key text NOT NULL,
    auth_user_id uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
    title text NOT NULL DEFAULT 'Yeni Sohbet',
    project_id text NULL,
    model_id text NOT NULL DEFAULT 'nietzsche',
    starred boolean NOT NULL DEFAULT false,
    thinking_budget text NOT NULL DEFAULT 'balanced',
    web_search_enabled boolean NOT NULL DEFAULT false,
    system_prompt text NULL,
    share_token text NULL,
    is_shared boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wim_chats_share_token_uidx
    ON public.wim_chats (share_token)
    WHERE share_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS wim_chats_owner_key_idx
    ON public.wim_chats (owner_key, updated_at DESC);

CREATE INDEX IF NOT EXISTS wim_chats_auth_user_id_idx
    ON public.wim_chats (auth_user_id)
    WHERE auth_user_id IS NOT NULL;

-- ── messages ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wim_chat_messages (
    id text PRIMARY KEY,
    chat_id text NOT NULL REFERENCES public.wim_chats (id) ON DELETE CASCADE,
    role text NOT NULL,
    content text NOT NULL DEFAULT '',
    model_used text NULL,
    thinking_process jsonb NULL,
    artifacts jsonb NULL,
    citations jsonb NULL,
    attachments jsonb NULL,
    os_action jsonb NULL,
    liked boolean NULL,
    edited_from_id text NULL,
    sort_index integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wim_chat_messages_chat_id_idx
    ON public.wim_chat_messages (chat_id, sort_index);

-- ── daily usage (auth-aware quotas) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wim_chat_usage (
    subject text NOT NULL,
    day date NOT NULL,
    request_count integer NOT NULL DEFAULT 0,
    PRIMARY KEY (subject, day)
);

CREATE OR REPLACE FUNCTION public.increment_wim_chat_usage(p_subject text, p_day date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    next_count integer;
BEGIN
    INSERT INTO public.wim_chat_usage (subject, day, request_count)
    VALUES (p_subject, p_day, 1)
    ON CONFLICT (subject, day)
    DO UPDATE SET request_count = public.wim_chat_usage.request_count + 1
    RETURNING request_count INTO next_count;
    RETURN next_count;
END;
$$;

-- ── updated_at ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.wim_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wim_chats_set_updated_at ON public.wim_chats;
CREATE TRIGGER wim_chats_set_updated_at
    BEFORE UPDATE ON public.wim_chats
    FOR EACH ROW
    EXECUTE FUNCTION public.wim_set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.wim_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wim_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wim_chat_usage ENABLE ROW LEVEL SECURITY;

-- Public can read shared chats by token (share page). Writes go through
-- service-role API routes that enforce JWT / device owner_key.
DROP POLICY IF EXISTS "wim_chats_public_shared_read" ON public.wim_chats;
CREATE POLICY "wim_chats_public_shared_read"
    ON public.wim_chats
    FOR SELECT
    USING (is_shared = true AND share_token IS NOT NULL);

DROP POLICY IF EXISTS "wim_chat_messages_public_shared_read" ON public.wim_chat_messages;
CREATE POLICY "wim_chat_messages_public_shared_read"
    ON public.wim_chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.wim_chats c
            WHERE c.id = chat_id
              AND c.is_shared = true
              AND c.share_token IS NOT NULL
        )
    );

COMMENT ON TABLE public.wim_chats IS 'WorldInMaking workspace chats (local-first dual-write)';
COMMENT ON TABLE public.wim_chat_messages IS 'Messages belonging to wim_chats';
COMMENT ON TABLE public.wim_chat_usage IS 'Daily workspace-chat request counters for auth-aware quotas';
