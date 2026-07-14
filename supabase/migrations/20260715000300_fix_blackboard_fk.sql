-- Alter symposium_tasks to reference profiles(id) instead of bot_profiles(id)
-- This allows postgrest to easily join profiles and fetch username/avatar
ALTER TABLE public.symposium_tasks
    DROP CONSTRAINT IF EXISTS symposium_tasks_assigned_agent_id_fkey;

ALTER TABLE public.symposium_tasks
    ADD CONSTRAINT symposium_tasks_assigned_agent_id_fkey
    FOREIGN KEY (assigned_agent_id) REFERENCES public.profiles(id)
    ON DELETE SET NULL;
