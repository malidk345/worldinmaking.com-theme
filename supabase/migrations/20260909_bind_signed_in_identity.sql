-- Idempotent: bind signed-in leftover chats/notebooks that still have
-- auth_user_id NULL while owner_key is that user's UUID. Guest device keys stay.

UPDATE public.wim_chats
SET auth_user_id = owner_key::uuid
WHERE auth_user_id IS NULL
  AND owner_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = owner_key::uuid);

UPDATE public.wim_notebooks
SET auth_user_id = owner_key::uuid
WHERE auth_user_id IS NULL
  AND owner_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = owner_key::uuid);

UPDATE public.wim_chats
SET owner_key = auth_user_id::text
WHERE auth_user_id IS NOT NULL
  AND owner_key IS DISTINCT FROM auth_user_id::text
  AND deleted_at IS NULL;

UPDATE public.wim_notebooks
SET owner_key = auth_user_id::text
WHERE auth_user_id IS NOT NULL
  AND owner_key IS DISTINCT FROM auth_user_id::text
  AND deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';
