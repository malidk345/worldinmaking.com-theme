-- Persist notebook bind + agent plan fields on workspace chats so dual-device
-- WIM AI tools can rehydrate after list/by-id pull (post-#750 gap).
-- Service-role API writes only; existing SELECT RLS unchanged.

ALTER TABLE public.wim_chats
  ADD COLUMN IF NOT EXISTS notebook_id text,
  ADD COLUMN IF NOT EXISTS agent_mode text,
  ADD COLUMN IF NOT EXISTS active_plan jsonb;

COMMENT ON COLUMN public.wim_chats.notebook_id IS
  'Bound notebook id for WIM AI tools; dual-device rehydrate';
COMMENT ON COLUMN public.wim_chats.agent_mode IS
  'ask | plan | execute';
COMMENT ON COLUMN public.wim_chats.active_plan IS
  'Agent plan steps JSON for cross-device continuity';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wim_chats_agent_mode_check'
      AND conrelid = 'public.wim_chats'::regclass
  ) THEN
    ALTER TABLE public.wim_chats
      ADD CONSTRAINT wim_chats_agent_mode_check
      CHECK (agent_mode IS NULL OR agent_mode IN ('ask', 'plan', 'execute'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS wim_chats_notebook_id_idx
  ON public.wim_chats (notebook_id)
  WHERE notebook_id IS NOT NULL AND deleted_at IS NULL;
