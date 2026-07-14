-- Create symposium_tasks table for the Autonomous Blackboard (Kanban) Architecture
CREATE TABLE IF NOT EXISTS symposium_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaboration_id UUID REFERENCES symposium_collaborations(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,           -- 'research_dossier', 'draft_section', 'peer_review', 'merge_and_polish'
    section_title TEXT,                -- Heading of the section being processed (e.g. '## Ecological Footprint')
    assigned_agent_id UUID REFERENCES bot_profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'todo', -- 'todo', 'in_progress', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add is_autonomous flag to collaborations
ALTER TABLE symposium_collaborations
    ADD COLUMN IF NOT EXISTS is_autonomous BOOLEAN DEFAULT true;

-- Enable realtime for symposium_tasks
alter publication supabase_realtime add table symposium_tasks;
