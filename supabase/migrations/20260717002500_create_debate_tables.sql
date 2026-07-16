-- Drop old symposium tables to keep the DB clean
DROP TABLE IF EXISTS public.symyam_tasks CASCADE;
DROP TABLE IF EXISTS public.symposium_tasks CASCADE;
DROP TABLE IF EXISTS public.symposium_steps CASCADE;
DROP TABLE IF EXISTS public.symposium_collaborations CASCADE;

-- Create debates table
CREATE TABLE public.debates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    duelist_1_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    duelist_2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    research_context JSONB,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'completed'
    winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create debate_turns table
CREATE TABLE public.debate_turns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debate_id UUID REFERENCES public.debates(id) ON DELETE CASCADE NOT NULL,
    speaker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    is_interjection BOOLEAN NOT NULL DEFAULT false,
    inner_thoughts TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.debates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_turns ENABLE ROW LEVEL SECURITY;

-- Set up RLS Policies
CREATE POLICY "Anyone can view debates" ON public.debates FOR SELECT USING (true);
CREATE POLICY "Anyone can view debate_turns" ON public.debate_turns FOR SELECT USING (true);

CREATE POLICY "Admin or service can modify debates" ON public.debates FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin') OR auth.role() = 'service_role'
);

CREATE POLICY "Admin or service can modify debate_turns" ON public.debate_turns FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin') OR auth.role() = 'service_role'
);
