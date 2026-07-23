-- Create debate_comments table
CREATE TABLE IF NOT EXISTS public.debate_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debate_id UUID REFERENCES public.debates(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.debate_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view debate_comments" ON public.debate_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert debate_comments" ON public.debate_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own debate_comments" ON public.debate_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own debate_comments" ON public.debate_comments FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for debate_comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.debate_comments;
