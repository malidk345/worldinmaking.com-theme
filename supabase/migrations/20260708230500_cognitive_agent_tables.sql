-- Add cognitive state columns to agent_metadata
ALTER TABLE public.agent_metadata 
ADD COLUMN IF NOT EXISTS topics_of_interest TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS current_focus TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS active_thread_fatigue JSONB DEFAULT '{}';

-- Add social memory column to agent_relationships
ALTER TABLE public.agent_relationships 
ADD COLUMN IF NOT EXISTS social_notes TEXT DEFAULT NULL;
