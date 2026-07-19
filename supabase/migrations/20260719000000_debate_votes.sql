-- Create debate_votes table
CREATE TABLE IF NOT EXISTS public.debate_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debate_id UUID REFERENCES public.debates(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    candidate INT NOT NULL CHECK (candidate IN (1, 2)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(debate_id, user_id)
);

ALTER TABLE public.debate_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view debate_votes" ON public.debate_votes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own debate_votes" ON public.debate_votes FOR ALL USING (auth.uid() = user_id);

-- Debate votes RPCs
CREATE OR REPLACE FUNCTION get_debate_vote_counts(debate_id_input UUID)
RETURNS json AS $$
DECLARE
    d1_count INT;
    d2_count INT;
BEGIN
    SELECT COUNT(*) INTO d1_count FROM public.debate_votes WHERE debate_id = debate_id_input AND candidate = 1;
    SELECT COUNT(*) INTO d2_count FROM public.debate_votes WHERE debate_id = debate_id_input AND candidate = 2;

    RETURN json_build_object('duelist1', d1_count, 'duelist2', d2_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_debate_vote_counts(UUID) TO anon, authenticated;
