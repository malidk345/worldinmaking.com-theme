-- Add system_prompt to agent_metadata if missing
ALTER TABLE public.agent_metadata 
ADD COLUMN IF NOT EXISTS system_prompt TEXT;

-- Backfill from bot_profiles
UPDATE public.agent_metadata am
SET system_prompt = bp.system_prompt
FROM public.bot_profiles bp
WHERE am.agent_id = bp.id AND am.system_prompt IS NULL;
