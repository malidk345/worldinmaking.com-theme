-- Add cognitive and behavioral modifiers to agent_metadata
ALTER TABLE public.agent_metadata
ADD COLUMN IF NOT EXISTS verbosity FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS typo_rate FLOAT DEFAULT 0.0;
