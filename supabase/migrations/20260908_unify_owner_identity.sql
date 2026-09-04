-- Bind leftover account rows; leave true guest device keys alone.
-- Also add bot-queue idempotency.

ALTER TABLE public.wim_bot_tasks ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS wim_bot_tasks_idempotency_uidx
    ON public.wim_bot_tasks (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

UPDATE public.wim_notebooks n
SET auth_user_id = n.owner_key::uuid
WHERE n.auth_user_id IS NULL
  AND n.owner_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = n.owner_key::uuid);

UPDATE public.wim_chats c
SET auth_user_id = c.owner_key::uuid
WHERE c.auth_user_id IS NULL
  AND c.owner_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = c.owner_key::uuid);

UPDATE public.wim_notebooks
SET owner_key = auth_user_id::text
WHERE auth_user_id IS NOT NULL
  AND owner_key IS DISTINCT FROM auth_user_id::text
  AND deleted_at IS NULL;

UPDATE public.wim_chats
SET owner_key = auth_user_id::text
WHERE auth_user_id IS NOT NULL
  AND owner_key IS DISTINCT FROM auth_user_id::text
  AND deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';
