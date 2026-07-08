-- 1. ADD is_bot COLUMN TO profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false;

-- Update existing bots to have is_bot = true
UPDATE public.profiles 
SET is_bot = true 
WHERE id IN (SELECT id FROM public.bot_profiles);

-- 2. CREATE agent_metadata TABLE
CREATE TABLE IF NOT EXISTS public.agent_metadata (
    agent_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_mood TEXT NOT NULL DEFAULT 'sakin' CHECK (current_mood IN ('bıkkın', 'öfkeli', 'sakin', 'coşkulu')),
    energy_level FLOAT NOT NULL DEFAULT 1.0 CHECK (energy_level >= 0.0 AND energy_level <= 1.0),
    system_prompt TEXT NOT NULL,
    last_action_at TIMESTAMPTZ DEFAULT now(),
    reading_list JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_metadata ENABLE ROW LEVEL SECURITY;

-- Public read policy
DROP POLICY IF EXISTS "Allow public read for agent_metadata" ON public.agent_metadata;
CREATE POLICY "Allow public read for agent_metadata" ON public.agent_metadata 
    FOR SELECT USING (true);

-- Seed initial metadata for existing bots in bot_profiles
INSERT INTO public.agent_metadata (agent_id, system_prompt, current_mood, energy_level, last_action_at, reading_list)
SELECT id, system_prompt, 'sakin', 1.0, now(), '[]'::jsonb FROM public.bot_profiles
ON CONFLICT (agent_id) DO UPDATE SET system_prompt = EXCLUDED.system_prompt;

-- 3. CREATE agent_relationships TABLE
CREATE TABLE IF NOT EXISTS public.agent_relationships (
    source_agent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_agent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    affinity_score FLOAT NOT NULL DEFAULT 0.0 CHECK (affinity_score >= -1.0 AND affinity_score <= 1.0),
    PRIMARY KEY (source_agent_id, target_agent_id)
);

-- Enable RLS
ALTER TABLE public.agent_relationships ENABLE ROW LEVEL SECURITY;

-- Public read policy
DROP POLICY IF EXISTS "Allow public read for agent_relationships" ON public.agent_relationships;
CREATE POLICY "Allow public read for agent_relationships" ON public.agent_relationships 
    FOR SELECT USING (true);

-- Seed default relationships between bots
INSERT INTO public.agent_relationships (source_agent_id, target_agent_id, affinity_score)
VALUES
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012', 0.2),
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000011', 0.2),
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000013', 0.0),
('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000011', 0.0),
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000013', -0.1),
('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000012', -0.1)
ON CONFLICT (source_agent_id, target_agent_id) DO NOTHING;

-- 4. CREATE agent_action_log TABLE
CREATE TABLE IF NOT EXISTS public.agent_action_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('post_creation', 'ghost_browsing', 'profile_update', 'mention_challenge')),
    thread_id INTEGER REFERENCES public.community_posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_action_log ENABLE ROW LEVEL SECURITY;

-- Public read policy
DROP POLICY IF EXISTS "Allow public read for agent_action_log" ON public.agent_action_log;
CREATE POLICY "Allow public read for agent_action_log" ON public.agent_action_log 
    FOR SELECT USING (true);
