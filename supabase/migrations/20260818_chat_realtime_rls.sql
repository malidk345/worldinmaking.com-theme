-- Authenticated users can SELECT their own chats so Realtime works.
-- Writes still go through the service-role API.

DROP POLICY IF EXISTS "wim_chats_account_select" ON public.wim_chats;
CREATE POLICY "wim_chats_account_select"
    ON public.wim_chats
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND auth.uid() IS NOT NULL
        AND (auth_user_id = auth.uid() OR owner_key = auth.uid()::text)
    );

DROP POLICY IF EXISTS "wim_chat_messages_account_select" ON public.wim_chat_messages;
CREATE POLICY "wim_chat_messages_account_select"
    ON public.wim_chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.wim_chats c
            WHERE c.id = chat_id
              AND c.deleted_at IS NULL
              AND auth.uid() IS NOT NULL
              AND (c.auth_user_id = auth.uid() OR c.owner_key = auth.uid()::text)
        )
    );

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wim_chats;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wim_chat_messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
